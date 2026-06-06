import {
  accountScopeKey,
  accountScopeLabel,
  accountScopeToParam,
  appendAccountScope,
  normalizeAccountScope,
} from "@/lib/accounts/account-scope"

describe("account scope helpers", () => {
  it("normalizes empty and all values to all accounts", () => {
    expect(normalizeAccountScope(null)).toEqual({ type: "all" })
    expect(normalizeAccountScope("")).toEqual({ type: "all" })
    expect(normalizeAccountScope("all")).toEqual({ type: "all" })
  })

  it("normalizes account ids to single-account scope", () => {
    expect(normalizeAccountScope("acc-1")).toEqual({ type: "single", accountId: "acc-1" })
    expect(accountScopeKey({ type: "single", accountId: "acc-1" })).toBe("account:acc-1")
    expect(accountScopeToParam({ type: "single", accountId: "acc-1" })).toBe("acc-1")
  })

  it("adds query params only for single-account scope", () => {
    const allQuery = new URLSearchParams()
    appendAccountScope(allQuery, { type: "all" })
    expect(allQuery.toString()).toBe("")

    const singleQuery = new URLSearchParams()
    appendAccountScope(singleQuery, { type: "single", accountId: "acc-1" })
    expect(singleQuery.get("accountId")).toBe("acc-1")
  })

  it("builds display labels from account list", () => {
    const accounts = [{ id: "acc-1", name: "Demo Brokerage" }]
    expect(accountScopeLabel({ type: "single", accountId: "acc-1" }, accounts, "All accounts")).toBe("Demo Brokerage")
    expect(accountScopeLabel({ type: "single", accountId: "missing" }, accounts, "All accounts")).toBe("All accounts")
  })
})

