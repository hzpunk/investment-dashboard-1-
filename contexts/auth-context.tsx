"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiFetch, isApiClientError } from "@/lib/api-client"
 
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
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const data = await apiFetch<{ user: AuthUser | null }>("/api/auth/me", { method: "GET" })
        const nextUser = data.user

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
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      queryClient.clear()
      setUser(data.user)
      setUserRole(data.user.role ?? null)
      return { error: null }
    } catch (error) {
      return { error: isApiClientError(error) ? { message: error.message, code: error.code } : error }
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      })

      queryClient.clear()
      setUser(data.user)
      setUserRole(data.user.role ?? null)
      return { error: null }
    } catch (error) {
      return { error: isApiClientError(error) ? { message: error.message, code: error.code } : error }
    }
  }

  const signOut = async () => {
    await apiFetch<{ signedOut: boolean }>("/api/auth/logout", { method: "POST" }).catch(() => null)
    queryClient.clear()
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

