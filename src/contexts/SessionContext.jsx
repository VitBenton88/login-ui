import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSessionUserInfo, userLogin, userLogout } from '../Api'

const SessionContext = createContext()

export function SessionProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState(null)

  const fetchSession = useCallback(async () => {
    try {
      const { email } = await getSessionUserInfo();
      setIsLoggedIn(true)
      setUserEmail(email)
    } catch (error) {
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const login = async (email, password) => {
    try {
      setLoading(true)
      await userLogin(email, password);
      await fetchSession()
    } catch (error) {
      console.log(error);
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false);
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await userLogout()
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