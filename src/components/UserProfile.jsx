import { useState } from 'react'
import SessionUserTable from './Tables/SessionUserTable'
import UserForm from './Forms/UserForm'

export default function UserProfile() {
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const handleClick = () => setShowUpdateForm(prev => !prev)

  return (
    <>
      <button onClick={handleClick} type='button'>{showUpdateForm ? 'Cancel' : 'Update Info'}</button>
      {showUpdateForm ? (
        <UserForm />
      ) : (
        <SessionUserTable />
      )}
    </>
  )
}
