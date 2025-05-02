import { createContext, useContext, useEffect, useState, useCallback } from 'react'

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

  const logout = async () => {
    await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
    })
    setIsLoggedIn(false)
  }

  return (
    <SessionContext.Provider value={{ isLoggedIn, logout, loading, fetchSession, userEmail }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}