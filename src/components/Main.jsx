import { useSession } from '../contexts/SessionContext'
import AuthPage from './AuthPage'
import ProtectedApp from './ProtectedApp'

export default function Main() {
  const { isLoggedIn } = useSession()

  return (
    <>
      {isLoggedIn ? <ProtectedApp /> : <AuthPage />}
    </>
  )
}
