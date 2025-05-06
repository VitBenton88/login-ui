import { useState } from 'react'
import UserNav from './Navs/UserNav'
import LogsTable from './Tables/LogsTable'
import UserProfile from './UserProfile'
import UsersTable from './Tables/UsersTable'

export default function ProtectedApp() {
  const [showUpdateForm, setLoading] = useState(true);

  return (
    <>
      <UserNav />
      <h2>User profile:</h2>
      <UserProfile />
      <h2>System info:</h2>
      <h3>Users</h3>
      <UsersTable />
      <h3>Logs</h3>
      <LogsTable />
    </>
  )
}
