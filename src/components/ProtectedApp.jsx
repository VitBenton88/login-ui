import UserNav from './Navs/UserNav'
import LogsTable from './Tables/LogsTable'
import UserProfile from './UserProfile'
import UsersTable from './Tables/UsersTable'
import { useSession } from '../contexts/SessionContext'

export default function ProtectedApp() {
  const { user } = useSession()

  return (
    <>
      <UserNav />
      <h2>User profile:</h2>
      <UserProfile />
      {user.isAdmin && (
        <>
          <h2>System info:</h2>
          <h3>Users</h3>
          <UsersTable />
          <h3>Logs</h3>
          <LogsTable />
        </>
      )}
    </>
  )
}
