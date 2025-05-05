import UserNav from '../components/navigations/UserNav'
import LogsTable from '../components/tables/LogsTable'
import UsersTable from '../components/tables/UsersTable'

export default function ProtectedApp() {
  return (
    <>
      <UserNav />
      <h2>System info:</h2>
      <h3>Users</h3>
      <UsersTable />
      <h3>Logs</h3>
      <LogsTable />
    </>
  )
}
