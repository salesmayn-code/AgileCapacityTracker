"use client"

import type React from "react"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { api } from "@/lib/api"

type User = {
  id: number
  username: string
  email: string
  role: "admin" | "team_lead" | "developer"
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Restore the session from the httpOnly cookie via the BFF
    let cancelled = false
    api
      .me()
      .then((me) => {
        if (!cancelled && me.email) setUser(me as User)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Redirect to login if not authenticated (public routes excluded)
    if (
      !isLoading &&
      !user &&
      pathname !== "/" &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/register")
    ) {
      router.push("/login")
    }
  }, [user, isLoading, pathname, router])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email, password)
      if (!result.user.email) throw new Error("Invalid email or password")
      setUser(result.user as User)
      router.push("/dashboard")
    },
    [router],
  )

  const logout = useCallback(() => {
    setUser(null)
    void Promise.resolve(api.logout()).catch(() => {})
    router.push("/login")
  }, [router])

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
