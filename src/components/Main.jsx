import { useSession } from '../contexts/SessionContext'
import AuthPage from './AuthPage'
import ProtectedApp from './ProtectedApp'
import Loader from '../components/Loader'

export default function Main() {
  const { isLoggedIn, loading } = useSession()

  if (loading) return <Loader />

  return (
    <>
      {isLoggedIn ? <ProtectedApp /> : <AuthPage />}
    </>
  )
}
