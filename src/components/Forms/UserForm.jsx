import { useState } from 'react'
import { useNotification } from '../../contexts/NotificationContext'
import { useSession } from '../../contexts/SessionContext'
import { isValidEmail } from '../../util/validation'

export default function UserForm() {
  const { updateEmail, userId, user } = useSession()
  const [newEmail, setEmail] = useState('')

  const { notify } = useNotification()

  const handleSubmit = async e => {
    e.preventDefault()

    if (!isValidEmail(newEmail)) {
      return notify('Invalid email format.')
    }

    try {
      await updateEmail(userId, newEmail)
      notify('✅ Email updated successfully')
    } catch (err) {
      notify(`❌ Failed to update email: ${err.message}`)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email:
        <input
          type='email'
          value={newEmail}
          placeholder={user.email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </label>
      <button disabled={!newEmail} type='submit'>Update Email</button>
    </form>
  )
}
