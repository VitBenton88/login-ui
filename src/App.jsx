import './App.css'
import Notification from './components/Notification'
import Main from './components/Main'
import { NotificationProvider } from './contexts/NotificationContext'
import { SessionProvider } from './contexts/SessionContext'

export default function App() {
  return (
    <NotificationProvider>
      <SessionProvider>
        <Notification />
        <Main />
      </SessionProvider>
    </NotificationProvider>
  )
}
