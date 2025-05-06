import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSessionUserInfo, updateUserEmailbyId, userLogin, userLogout } from '../api'

const SessionContext = createContext()

export function SessionProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  const fetchSession = useCallback(async () => {
    try {
      if (isLoggedIn) {
        const { id } = await getSessionUserInfo()
        setUserId(id)
      }
    } catch (error) {
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    fetchSession()
  }, [isLoggedIn])

  const login = async (email, password) => {
    try {
      setLoading(true)
      await userLogin(email, password)
      setIsLoggedIn(true)
      await fetchSession()
    } catch (error) {
      console.log(error)
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateEmail = async (id, email) => {
    try {
      setLoading(true)
      await updateUserEmailbyId(id, email)
    } catch (error) {
      console.log(error);
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
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
      setLoading(false)
    }
  }

  return (
    <SessionContext.Provider value={{ isLoggedIn, logout, loading, login, userId, updateEmail }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}