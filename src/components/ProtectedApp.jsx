import UserNav from './Navs/UserNav'
import LogsTable from './Layouts/LogsTable'
import UserForm from './Info/UserForm'
import UsersTable from './Layouts/UsersTable'

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
