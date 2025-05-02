import { useNotification } from '../contexts/NotificationContext'

export default function Notification() {
  const { message, type } = useNotification()

  if (!message) return null

  return (
    <div className={`notification ${type}`}>
      <p>{message}</p>
    </div>
  )
}
