import UserNav from './Navs/UserNav'
import LogsTable from './Tables/LogsTable'
import UserForm from './Forms/UserForm'
import UsersTable from './Tables/UsersTable'

export default function ProtectedApp() {
  return (
    <>
      <UserNav />
      <h2>User info:</h2>
      <UserForm />
      <h2>System info:</h2>
      <h3>Users</h3>
      <UsersTable />
      <h3>Logs</h3>
      <LogsTable />
    </>
  )
}
