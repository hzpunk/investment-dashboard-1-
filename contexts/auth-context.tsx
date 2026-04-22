"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
 
type AuthUser = {
  id: string
  email: string
  username: string
  role: string
}

interface AuthContextType {
  user: AuthUser | null
  session: null
  isLoading: boolean
  userRole: string | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" })
        const data = await res.json().catch(() => null)
        const nextUser = data?.user as AuthUser | null

        setSession(null)
        setUser(nextUser)
        setUserRole(nextUser?.role ?? null)
      } catch (error) {
        console.error("Error fetching session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
    return () => {}
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return { error: { message: data?.error || "Login failed" } }
      }

      setUser(data?.user ?? null)
      setUserRole(data?.user?.role ?? null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return { error: { message: data?.error || "Registration failed" } }
      }

      setUser(data?.user ?? null)
      setUserRole(data?.user?.role ?? null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null)
    setUser(null)
    setUserRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, userRole, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

