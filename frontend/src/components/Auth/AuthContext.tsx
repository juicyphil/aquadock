import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '../../types'
import { api } from '../../api/client'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aquadock_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.getStatus()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('aquadock_token')
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password)
    localStorage.setItem('aquadock_token', res.token)
    setToken(res.token)
    setUser(res.user)
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await api.register(username, email, password)
    localStorage.setItem('aquadock_token', res.token)
    localStorage.removeItem('aquadock_onboarded')
    setToken(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('aquadock_token')
    localStorage.removeItem('aquadock_onboarded')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
