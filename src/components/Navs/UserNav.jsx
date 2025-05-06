import { useNotification } from '../../contexts/NotificationContext'
import { useSession } from '../../contexts/SessionContext'

export default function UserNav() {
  const { logout } = useSession()
  const { notify } = useNotification()

  const handleClick = e => {
    try {
      logout()
      notify('Successfully logged out!', 'success')
    } catch (error) {
      notify(err.message, 'error')
    }
  }

  return (
    <header>
      <nav role="tablist" aria-label="User menu">
        <button
          role="tab"
          aria-selected={true}
          tabIndex="0"
          onClick={handleClick}
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
