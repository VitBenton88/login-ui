import { createContext, useReducer, useContext, useEffect, useState, useCallback } from 'react'
import { getSessionUserInfo, getUserbyId, updateUserEmailbyId, userLogin, userLogout } from '../api'

const SessionContext = createContext()

function userReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {
        email: action.payload.email,
        created: action.payload.created
      };
    case 'CLEAR_USER':
      return { email: '', created: '' };
    default:
      return state;
  }
}

const initialUserState = {
  email: '',
  created: ''
}

export function SessionProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [user, userDispatch] = useReducer(userReducer, initialUserState)

  const fetchUser = useCallback(async id => {
    try {
      if (id) {
        setLoading(true)
        const payload = await getUserbyId(id);
        userDispatch({ type: 'SET_USER', payload })
      }
    } catch (error) {
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSession = useCallback(async () => {
    try {
      const { id } = await getSessionUserInfo()
      setUserId(id)
      setIsLoggedIn(true)
    } catch (error) {
      setIsLoggedIn(false)
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    fetchSession()
  }, [])

  useEffect(() => {
    fetchUser(userId);
  }, [userId])

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