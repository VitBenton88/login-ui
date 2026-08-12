import { createContext, useReducer, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { getRefreshToken, getSessionUserInfo, updateUserEmailbyId, userLogin, userLogout } from '../api'
import { useNotification } from './NotificationContext'

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
  const { notify } = useNotification()
  const channelRef = useRef(null)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel('session')
    channelRef.current = channel

    channel.onmessage = event => {
      if (event.data?.type === 'token-refreshed') {
        localStorage.setItem('accessToken', event.data.accessToken)
      } else if (event.data?.type === 'session-ended') {
        localStorage.removeItem('accessToken')
        setIsLoggedIn(false)
        userDispatch({ type: 'CLEAR_USER' })
      }
    }

    return () => channel.close()
  }, [])

  // Resolves true only once /auth/me has actually confirmed a session —
  // never throws, so callers always get a definitive answer instead of a
  // mix of thrown errors and silently-swallowed failures. `isRetry` is
  // local to each call chain (not shared component state) so that two
  // genuinely concurrent chains — e.g. StrictMode's double-invoked mount
  // effect — each get their own bounded single retry instead of
  // interfering with each other's.
  const fetchSession = useCallback(async (isRetry = false) => {
    // A stored accessToken can only have gotten there via a prior
    // successful login (this tab or a sibling tab, via the
    // BroadcastChannel `token-refreshed` message) — so its presence
    // before this call chain touches anything is real evidence this
    // browser believed it had a session, and unlike an in-memory ref,
    // that evidence survives a reload. Only the top-level (non-retry)
    // call's snapshot matters — the recursive retry call must not
    // re-read localStorage after the refresh above just updated it.
    const hadStoredSession = !isRetry && !!localStorage.getItem('accessToken')

    try {
      const { id, email, created, isAdmin } = await getSessionUserInfo()
      setUserId(id)
      userDispatch({ type: 'SET_USER', payload: { email, created, isAdmin } })
      setIsLoggedIn(true)
      return true
    } catch (error) {
      if (error.cause?.status === 401 && !isRetry) {
        try {
          const { accessToken } = await getRefreshToken();
          localStorage.setItem('accessToken', accessToken);
          // Other tabs can reuse this token instead of racing their own
          // refresh against the same (now-rotated) cookie.
          channelRef.current?.postMessage({ type: 'token-refreshed', accessToken })
          return await fetchSession(true)
        } catch (refreshError) {
          if (refreshError.cause?.status === 429) {
            notify('Too many attempts. Please wait a moment and try again.', 'error')
          } else if (hadStoredSession) {
            // Distinct from the silent first-visit case below: this
            // browser had a stored token — i.e. was genuinely logged in
            // — and the refresh got rejected, most likely because
            // another tab/device refreshed first and rotated the token
            // this one was holding.
            notify('Your session ended (perhaps you signed in elsewhere). Please log in again.', 'error')
            channelRef.current?.postMessage({ type: 'session-ended' })
          }
          // No stored token at all means this was never a real session
          // to begin with (e.g. first visit) — no toast, straight to login.

          setIsLoggedIn(false)
          return false
        }
      }

      if (error.cause?.status !== 401) {
        notify(error.message, 'error')
      }

      setIsLoggedIn(false)
      return false
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchSession().catch(error => notify(error.message, 'error'))
  }, [])

  const login = async (email, password) => {
    try {
      setLoading(true)
      await userLogin(email, password)
      const succeeded = await fetchSession()

      if (!succeeded) {
        throw new Error('Logged in, but failed to load your session. Please try again.')
      }
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
