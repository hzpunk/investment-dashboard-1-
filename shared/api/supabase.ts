// Internal API shim replacing Supabase
// All calls go to internal Next.js API routes

type User = {
  id: string
  email: string
  user_metadata?: { username?: string }
}

type Session = {
  user: User
}

type AuthResponse = {
  data: { user: User | null; session: Session | null }
  error: Error | null
}

// Simulated Supabase client using internal APIs
export const supabase = {
  auth: {
    async getSession(): Promise<AuthResponse> {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return { data: { user: null, session: null }, error: null }
        const user = await res.json()
        return {
          data: { user, session: user ? { user } : null },
          error: null
        }
      } catch (e) {
        return { data: { user: null, session: null }, error: e as Error }
      }
    },

    async signInWithPassword({ email, password }: { email: string; password: string }): Promise<AuthResponse> {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) {
          return { data: { user: null, session: null }, error: new Error('Invalid credentials') }
        }
        const user = await res.json()
        return {
          data: { user, session: { user } },
          error: null
        }
      } catch (e) {
        return { data: { user: null, session: null }, error: e as Error }
      }
    },

    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { username?: string } } }): Promise<AuthResponse> {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, username: options?.data?.username }),
        })
        if (!res.ok) {
          return { data: { user: null, session: null }, error: new Error('Registration failed') }
        }
        const user = await res.json()
        return {
          data: { user, session: { user } },
          error: null
        }
      } catch (e) {
        return { data: { user: null, session: null }, error: e as Error }
      }
    },

    async signOut(): Promise<{ error: Error | null }> {
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
        return { error: null }
      } catch (e) {
        return { error: e as Error }
      }
    },

    async updateUser({ password }: { password: string }): Promise<{ data: { user: User } | null; error: Error | null }> {
      try {
        const res = await fetch('/api/auth/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: password }),
        })
        if (!res.ok) throw new Error('Update failed')
        const user = await res.json()
        return { data: { user }, error: null }
      } catch (e) {
        return { data: null, error: e as Error }
      }
    },

    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      // Polling-based session check
      const checkSession = async () => {
        const { data } = await this.getSession()
        callback(data.session ? 'SIGNED_IN' : 'SIGNED_OUT', data.session)
      }
      checkSession()
      const interval = setInterval(checkSession, 30000)
      return {
        data: {
          subscription: {
            unsubscribe: () => clearInterval(interval)
          }
        }
      }
    }
  },

  from(table: string) {
    return {
      async select(columns: string) {
        try {
          const res = await fetch(`/api/data/${table}`)
          const data = await res.json()
          return { data: Array.isArray(data) ? data : data[table] || data, error: null }
        } catch (e) {
          return { data: null, error: e }
        }
      },
      async insert(values: any) {
        try {
          const res = await fetch(`/api/data/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          })
          const data = await res.json()
          return { data, error: null }
        } catch (e) {
          return { data: null, error: e }
        }
      },
      async update(values: any) {
        try {
          const res = await fetch(`/api/data/${table}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          })
          const data = await res.json()
          return { data, error: null }
        } catch (e) {
          return { data: null, error: e }
        }
      },
      async delete() {
        try {
          const res = await fetch(`/api/data/${table}`, { method: 'DELETE' })
          const data = await res.json()
          return { data, error: null }
        } catch (e) {
          return { data: null, error: e }
        }
      },
      eq(column: string, value: any) {
        return this
      },
      single() {
        return this
      }
    }
  }
}


