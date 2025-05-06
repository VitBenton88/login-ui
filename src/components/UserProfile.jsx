import { useState } from 'react'
import SessionUserTable from './Tables/SessionUserTable'
import UserForm from './Forms/UserForm'

export default function UserProfile() {
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  return (
    <>
      {showUpdateForm ? (
        <UserForm />
      ) : (
        <SessionUserTable />
      )}
    </>
  )
}
