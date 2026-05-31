import { NextResponse } from "next/server"
import { invalidateUserTransactionsCache } from "@/lib/cache-invalidation"
import { withAuth, errorResponse, successResponse, parsePagination } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"

const transactionTypes = new Set(["buy", "sell", "dividend", "interest", "deposit", "withdrawal"])
const investmentTypes = new Set(["buy", "sell", "dividend"])

function formatTransaction(transaction: any) {
  return {
    ...transaction,
    date: transaction.date.toISOString(),
    accounts: transaction.account,
    assets: transaction.asset,
  }
}

function numericValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

export const GET = withAuth(async (request, user) => {
  const { limit } = parsePagination(new URL(request.url).searchParams)

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: {
      account: { select: { id: true, name: true } },
      asset: { select: { id: true, symbol: true, name: true, type: true } },
    },
    orderBy: { date: "desc" },
    take: limit,
  })

  return successResponse(transactions.map(formatTransaction))
})

export const POST = withAuth(async (request, user) => {
  const data = await request.json().catch(() => null)

  const accountId = data?.accountId ?? data?.account_id
  const assetId = data?.assetId ?? data?.asset_id ?? null
  const type = data?.type
  const totalAmount = numericValue(data?.totalAmount ?? data?.total_amount)
  const quantity = numericValue(data?.quantity)
  const pricePerUnit = numericValue(data?.pricePerUnit ?? data?.price_per_unit)
  const fee = numericValue(data?.fee) ?? 0
  const currency = typeof data?.currency === "string" && data.currency.trim() ? data.currency.trim().toUpperCase() : "USD"
  const notes = typeof data?.notes === "string" && data.notes.trim() ? data.notes.trim() : null
  const date = data?.date ? new Date(data.date) : new Date()

  if (!accountId || typeof accountId !== "string") {
    return errorResponse("Account is required", 400, "ACCOUNT_REQUIRED")
  }

  if (!type || typeof type !== "string" || !transactionTypes.has(type)) {
    return errorResponse("Invalid transaction type", 400, "INVALID_TRANSACTION_TYPE")
  }

  if (totalAmount === null || totalAmount <= 0) {
    return errorResponse("Total amount must be greater than zero", 400, "INVALID_TOTAL_AMOUNT")
  }

  if (Number.isNaN(date.getTime())) {
    return errorResponse("Invalid transaction date", 400, "INVALID_DATE")
  }

  if (investmentTypes.has(type) && (!assetId || typeof assetId !== "string")) {
    return errorResponse("Asset is required for this transaction type", 400, "ASSET_REQUIRED")
  }

  if ((type === "buy" || type === "sell") && (quantity === null || quantity <= 0 || pricePerUnit === null || pricePerUnit <= 0)) {
    return errorResponse("Quantity and price are required for buy/sell transactions", 400, "INVALID_QUANTITY_OR_PRICE")
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: user.id },
    select: { id: true },
  })

  if (!account) {
    return errorResponse("Account not found", 404, "ACCOUNT_NOT_FOUND")
  }

  if (assetId) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true },
    })

    if (!asset) {
      return errorResponse("Asset not found", 404, "ASSET_NOT_FOUND")
    }
  }

  const balanceDelta =
    type === "buy" || type === "withdrawal"
      ? -(totalAmount + fee)
      : type === "sell" || type === "deposit" || type === "dividend" || type === "interest"
        ? totalAmount - fee
        : 0

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: user.id,
          accountId,
          assetId,
          type: type as any,
          quantity: quantity ?? null,
          pricePerUnit: pricePerUnit ?? null,
          totalAmount,
          fee,
          currency,
          date,
          notes,
        },
        include: {
          account: { select: { id: true, name: true } },
          asset: { select: { id: true, symbol: true, name: true, type: true } },
        },
      })

      if (balanceDelta !== 0) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: balanceDelta } },
        })
      }

      return created
    })

    await invalidateUserTransactionsCache(user.id)
    return NextResponse.json({ transaction: formatTransaction(transaction) }, { status: 201 })
  } catch (error) {
    console.error("Failed to create transaction:", error)
    return errorResponse("Failed to create transaction", 500, "TRANSACTION_CREATE_FAILED")
  }
})
