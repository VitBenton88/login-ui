import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { loginErrors } from '../Constants'

const SessionContext = createContext()

export function SessionProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState(null)

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/me', { credentials: 'include' })
      if (!res.ok) throw new Error('Not authenticated')
      const { email } = await res.json();
      setIsLoggedIn(true)
      setUserEmail(email)
    } catch (err) {
      // not sure
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const login = async (email, password) => {
    setLoading(true)

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const cause = loginErrors[response.status] || loginErrors.default
        throw new Error('Login failed', { cause })
      }

      fetchSession()
    } catch (error) {
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false);
    }
  }

  const logout = async () => {
    setLoading(true)

    try {
      await fetch('/logout', {
        method: 'POST',
        credentials: 'include',
      })
      setIsLoggedIn(false)
    } catch (error) {
      throw new Error(error.message)
    } finally {
      setLoading(false);
    }
  }

  return (
    <SessionContext.Provider value={{ isLoggedIn, logout, loading, login, userEmail }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}