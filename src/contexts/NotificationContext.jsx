import { createContext, useContext, useState, useCallback, useRef } from 'react'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const timeoutRef = useRef(null)
  const [message, setMessage] = useState(null)
  const [type, setType] = useState(null)

  const notify = useCallback((msg, type, timeout = 10000) => {
    setMessage(msg)
    setType(type)

    // Clear existing timeout if it's still pending
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set a new timeout to clear the message
    timeoutRef.current = setTimeout(() => {
      reset()
    }, timeout)

  }, [])

  const reset = () => {
    setMessage(null)
    setType(null)
    timeoutRef.current = null
  }

  return (
    <NotificationContext.Provider value={{ message, type, notify }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  return useContext(NotificationContext)
}
