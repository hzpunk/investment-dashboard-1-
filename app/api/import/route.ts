import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRequestUser } from "@/lib/api-auth"
import { sanitizeSymbol, isValidUUID } from "@/lib/validation"

// POST /api/import/transactions - import transactions from CSV
export async function POST(request: Request) {
  const user = await requireRequestUser()
  
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const importType = formData.get("type") as string || "auto"
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    const content = await file.text()
    const format = detectFormat(content, file.name)
    
    let result: ImportResult
    
    switch (format) {
      case "csv":
        result = await importCSV(content, user.id, importType)
        break
      case "json":
        result = await importJSON(content, user.id)
        break
      default:
        return NextResponse.json(
          { error: "Unsupported file format" },
          { status: 400 }
        )
    }

    // Log import activity
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "IMPORT",
        entityType: "transactions",
        entityId: "batch",
        details: {
          fileName: file.name,
          format,
          imported: result.imported,
          errors: result.errors.length,
        },
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    )
  }
}

type ImportResult = {
  imported: number
  errors: string[]
  skipped: number
}

function detectFormat(content: string, filename: string): "csv" | "json" | null {
  if (filename.endsWith(".json")) return "json"
  if (filename.endsWith(".csv")) return "csv"
  
  // Try to detect from content
  if (content.trim().startsWith("[") || content.trim().startsWith("{")) {
    return "json"
  }
  if (content.includes(",")) {
    return "csv"
  }
  return null
}

async function importCSV(content: string, userId: string, importType: string): Promise<ImportResult> {
  const lines = content.split("\n").filter((l) => l.trim())
  if (lines.length < 2) {
    return { imported: 0, errors: ["CSV file is empty or has no data rows"], skipped: 0 }
  }

  const headers = parseCSVLine(lines[0])
  const result: ImportResult = { imported: 0, errors: [], skipped: 0 }
  
  // Find or create default account
  let defaultAccount = await prisma.account.findFirst({
    where: { userId },
  })
  
  if (!defaultAccount) {
    defaultAccount = await prisma.account.create({
      data: {
        userId,
        name: "Imported Account",
        type: "brokerage",
        balance: 0,
        currency: "USD",
      },
    })
  }

  // Collect all unique symbols first for batch asset creation
  const symbolMap = new Map<string, { price: number; type: string }>()
  const transactions: any[] = []

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i])
      const row: Record<string, string> = {}

      headers.forEach((h: string, idx: number) => {
        row[h.toLowerCase().replace(/\s+/g, "_")] = values[idx] || ""
      })

      // Map common field names
      const date = row.date || row.transaction_date || row["trade_date"] || ""
      const rawSymbol = row.symbol || row.ticker || row["asset_symbol"] || ""
      const symbol = sanitizeSymbol(rawSymbol)
      const type = (row.type || row.transaction_type || row.action || "buy").toLowerCase()
      const quantity = parseFloat(row.quantity || row.shares || row.qty || "0")
      const price = parseFloat(row.price || row["price_per_share"] || row["price_per_unit"] || "0")
      const total = parseFloat(row.total || row.amount || row["total_amount"] || row.proceeds || "0")
      const fee = parseFloat(row.fee || row.commission || "0")

      // Skip invalid rows
      if (!date || (!quantity && !total)) {
        result.skipped++
        continue
      }

      // Collect unique symbols
      if (symbol && !symbolMap.has(symbol)) {
        symbolMap.set(symbol, { price, type: inferAssetType(symbol) })
      }

      transactions.push({
        userId,
        accountId: defaultAccount.id,
        symbol,
        type: mapTransactionType(type),
        quantity: quantity || null,
        pricePerUnit: price || null,
        totalAmount: total || (quantity * price) + fee,
        fee,
        currency: row.currency || row["transaction_currency"] || "USD",
        date: new Date(date),
        notes: `Imported from CSV row ${i}`,
      })
    } catch (e: any) {
      result.errors.push(`Row ${i}: ${e.message}`)
    }
  }

  // Batch create/update assets
  const assetUpserts = Array.from(symbolMap.entries()).map(([symbol, data]) =>
    prisma.asset.upsert({
      where: { symbol },
      create: {
        symbol,
        name: symbol,
        type: data.type as any,
        currentPrice: data.price || 0,
        currency: "USD",
      },
      update: {},
    })
  )

  const assets = assetUpserts.length > 0 ? await prisma.$transaction(assetUpserts) : []
  const assetIdMap = new Map(assets.map(a => [a.symbol, a.id]))

  // Batch create transactions
  if (transactions.length > 0) {
    const BATCH_SIZE = 100
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE)
      await prisma.$transaction(
        batch.map(tx => prisma.transaction.create({
          data: { ...tx, assetId: tx.symbol ? assetIdMap.get(tx.symbol) : null }
        }))
      )
      result.imported += batch.length
    }
  }

  return result
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function inferAssetType(symbol: string): "stock" | "bond" | "etf" | "crypto" | "commodity" | "other" {
  const upper = symbol.toUpperCase()
  
  // Crypto patterns
  if (upper.endsWith("-USD") || upper.endsWith("-USDT") || upper.endsWith("-BTC")) {
    return "crypto"
  }
  
  // Common crypto tickers
  const cryptoTickers = ["BTC", "ETH", "ADA", "SOL", "DOT", "LINK", "UNI", "AAVE"]
  if (cryptoTickers.includes(upper)) {
    return "crypto"
  }
  
  // ETF patterns
  if (upper.length >= 3 && upper.length <= 5 && /^[A-Z]+$/.test(upper)) {
    const etfPatterns = ["SPY", "VOO", "VTI", "QQQ", "IWM", "EFA", "AGG", "BND"]
    if (etfPatterns.includes(upper)) {
      return "etf"
    }
  }
  
  return "stock"
}

function mapTransactionType(type: string): "buy" | "sell" | "dividend" | "interest" | "deposit" | "withdrawal" {
  const normalized = type.toLowerCase().trim()
  
  if (normalized.includes("buy") || normalized.includes("purchase")) return "buy"
  if (normalized.includes("sell") || normalized.includes("sale")) return "sell"
  if (normalized.includes("dividend")) return "dividend"
  if (normalized.includes("interest")) return "interest"
  if (normalized.includes("deposit")) return "deposit"
  if (normalized.includes("withdrawal")) return "withdrawal"
  
  return "buy" // Default
}

async function importJSON(content: string, userId: string): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, errors: [], skipped: 0 }
  
  try {
    const data = JSON.parse(content)
    const transactions = Array.isArray(data) ? data : data.transactions || []
    
    // Find or create default account
    let defaultAccount = await prisma.account.findFirst({
      where: { userId },
    })
    
    if (!defaultAccount) {
      defaultAccount = await prisma.account.create({
        data: {
          userId,
          name: "Imported Account",
          type: "brokerage",
          balance: 0,
          currency: "USD",
        },
      })
    }

    for (const t of transactions) {
      try {
        const symbol = t.symbol || t.ticker || ""
        
        // Find or create asset
        let assetId: string | null = null
        if (symbol) {
          const asset = await prisma.asset.upsert({
            where: { symbol: symbol.toUpperCase() },
            create: {
              symbol: symbol.toUpperCase(),
              name: t.assetName || symbol.toUpperCase(),
              type: inferAssetType(symbol),
              currentPrice: t.price || t.pricePerUnit || 0,
              currency: t.currency || "USD",
            },
            update: {},
          })
          assetId = asset.id
        }

        await prisma.transaction.create({
          data: {
            userId,
            accountId: defaultAccount.id,
            assetId,
            type: mapTransactionType(t.type || t.transactionType),
            quantity: t.quantity || t.shares || null,
            pricePerUnit: t.price || t.pricePerUnit || null,
            totalAmount: t.total || t.totalAmount || t.amount || 0,
            fee: t.fee || t.commission || 0,
            currency: t.currency || "USD",
            date: new Date(t.date || t.transactionDate),
            notes: t.notes || t.description || "Imported from JSON",
          },
        })

        result.imported++
      } catch (e: any) {
        result.errors.push(e.message)
      }
    }
  } catch (e: any) {
    result.errors.push(`JSON parse error: ${e.message}`)
  }

  return result
}
