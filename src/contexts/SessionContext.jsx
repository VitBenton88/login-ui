import { createContext, useReducer, useContext, useEffect, useState, useCallback } from 'react'
import { getRefreshToken, getSessionUserInfo, updateUserEmailbyId, userLogin, userLogout } from '../api'

const SessionContext = createContext()

function userReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {
        email: action.payload.email,
        created: action.payload.created,
        isAdmin: action.payload.isAdmin
      };
    case 'CLEAR_USER':
      return { email: '', created: '', isAdmin: false };
    default:
      return state;
  }
}

const initialUserState = {
  email: '',
  created: '',
  isAdmin: false
}

export function SessionProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [user, userDispatch] = useReducer(userReducer, initialUserState)

  const fetchSession = useCallback(async () => {
    try {
      const { id, email, created, isAdmin } = await getSessionUserInfo()
      setUserId(id)
      userDispatch({ type: 'SET_USER', payload: { email, created, isAdmin } })
      setIsLoggedIn(true)
    } catch (error) {
      if (error?.message.includes('401')) {
        try {
          const { accessToken } = await getRefreshToken();
          localStorage.setItem('accessToken', accessToken);
          return await fetchSession();
        } catch {
          setLoading(false)
          return
        }
      }

      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [])

  const login = async (email, password) => {
    try {
      setLoading(true)
      await userLogin(email, password)
      setIsLoggedIn(true)
      await fetchSession()
    } catch (error) {
      console.error(error)
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateEmail = useCallback(async (id, email) => {
    try {
      setLoading(true)
      await updateUserEmailbyId(id, email)
    } catch (error) {
      console.log(error);
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await userLogout()
      localStorage.removeItem('accessToken')
      userDispatch({ type: 'CLEAR_USER' })
      setIsLoggedIn(false)
    } catch (error) {
      throw new Error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <SessionContext.Provider value={{ isLoggedIn, logout, loading, login, userId, updateEmail, user }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
