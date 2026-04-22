// Shim for compatibility with components that import from lib/supabase
// This redirects all calls to our internal API endpoints

// Base fetch helper
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<{ data: T | null; error: any }> {
  try {
    const res = await fetch(endpoint, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }))
      return { data: null, error: err.error || `HTTP ${res.status}` }
    }
    const data = await res.json()
    return { data, error: null }
  } catch (e: any) {
    return { data: null, error: e.message || "Network error" }
  }
}

// Mock auth object
const mockAuth = {
  updateUser: async ({ password }: { password: string }) => {
    const res = await fetch("/api/auth/password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to update password" }))
      return { error: { message: err.error || "Failed" } }
    }
    return { error: null }
  },
  getUser: async () => {
    const { data, error } = await apiFetch<{ user: any }>("/api/auth/me")
    return { data: { user: data?.user || null }, error }
  },
  getSession: async () => {
    const { data, error } = await apiFetch<{ user: any }>("/api/auth/me")
    return { data: { session: data?.user ? { user: data.user } : null }, error }
  },
  signInWithPassword: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
}

// Query builder factory - creates isolated state per query chain
function createQueryBuilder(table: string, filters: string[] = []) {
  const queryFilters = [...filters]

  // Helper to make an object thenable (awaitable)
  const makeThenable = (obj: any, filters: string[]) => {
    const runQuery = async () => {
      const queryString = filters.length ? `?${filters.join("&")}` : ""
      const { data, error } = await apiFetch(`/api/data/${table}${queryString}`)
      // Unwrap { goals } wrapper if present
      const d = data as any
      const unwrapped = d && typeof d === 'object' && !Array.isArray(d) 
        ? (d.goals || d.transactions || d.accounts || d.portfolios || d)
        : d
      return { data: unwrapped, error }
    }
    obj.then = async (onFulfilled: any, onRejected: any) => {
      try {
        const result = await runQuery()
        return onFulfilled ? onFulfilled(result) : result
      } catch (e) {
        if (onRejected) return onRejected(e)
        throw e
      }
    }
    return obj
  }

  const builder: any = {
    eq: (field: string, value: any) => {
      const newFilters = [...queryFilters, `${field}=${encodeURIComponent(value)}`]
      return makeThenable({
        single: async () => {
          const { data, error } = await apiFetch(`/api/data/${table}?${newFilters.join("&")}`)
          const arr = Array.isArray(data) ? data : [data]
          return { data: arr[0], error }
        },
        limit: (n: number) => ({
          order: () => makeThenable({
            then: async (cb: any) => {
              const { data, error } = await apiFetch(`/api/data/${table}?${newFilters.join("&")}&limit=${n}`)
              return cb({ data, error })
            }
          }, []),
        }),
        order: (col: string, { ascending = true } = {}) => makeThenable({
          then: async (cb: any) => {
            const { data, error } = await apiFetch(`/api/data/${table}?${newFilters.join("&")}&order=${col}&asc=${ascending}`)
            return cb({ data, error })
          }
        }, []),
      }, newFilters)
    },
    single: async () => {
      const { data, error } = await apiFetch(`/api/data/${table}?${queryFilters.join("&")}`)
      const arr = Array.isArray(data) ? data : [data]
      return { data: arr[0], error }
    },
    limit: (n: number) => ({
      order: () => makeThenable({
        then: async (cb: any) => {
          const { data, error } = await apiFetch(`/api/data/${table}?${queryFilters.join("&")}&limit=${n}`)
          return cb({ data, error })
        }
      }, []),
    }),
    order: (col: string, { ascending = true } = {}) => makeThenable({
      then: async (cb: any) => {
        const { data, error } = await apiFetch(`/api/data/${table}?${queryFilters.join("&")}&order=${col}&asc=${ascending}`)
        return cb({ data, error })
      }
    }, []),
  }

  return makeThenable(builder, queryFilters)
}

// Main mock supabase object
export const supabase = {
  auth: mockAuth,
  from: (table: string) => ({
    select: (fields = "*") => {
      return createQueryBuilder(table)
    },
    insert: async (data: any) => {
      const { data: resData, error } = await apiFetch(`/api/data/${table}`, {
        method: "POST",
        body: JSON.stringify(data),
      })
      return { data: resData, error }
    },
    update: (data: any) => ({
      eq: async (field: string, value: any) => {
        const { data: resData, error } = await apiFetch(`/api/data/${table}?${field}=${encodeURIComponent(value)}`, {
          method: "PUT",
          body: JSON.stringify(data),
        })
        return { data: resData, error }
      }
    }),
    delete: () => ({
      eq: async (field: string, value: any) => {
        const { data, error } = await apiFetch(`/api/data/${table}?${field}=${encodeURIComponent(value)}`, {
          method: "DELETE",
        })
        return { data, error }
      }
    }),
  }),
} as any

