import { useCallback, useEffect, useState } from "react"
import { useSession } from '../contexts/SessionContext'
import { useNotification } from '../contexts/NotificationContext'

export default function UsersTable() {
  const { userEmail } = useSession()
  const { notify } = useNotification()

  const [users, setUsers] = useState([]);

  const handleClick = useCallback(id => {
    const controller = new AbortController();
    const deleteUser = async (userId = id) => {
      try {
        const res = await fetch(`/delete/${userId}`, { credentials: 'include', method: 'DELETE', signal: controller.signal })
        if (!res.ok) throw new Error('Failed to delete user.')

        setUsers(prev => prev.filter(({ id }) => id !== userId))
        notify('Successfully deleted user.', 'success')
      } catch (err) {
        console.error(err)
        notify(err.cause || err.message, 'error')
      }
    }

    deleteUser()

    return () => controller.abort();
  }, [users])

  useEffect(() => {
    const controller = new AbortController();
    const fetchUsers = async () => {
      try {
        const res = await fetch('/users', { credentials: 'include', signal: controller.signal })
        if (!res.ok) throw new Error('Failed to fetch users.')
        const fetchedUsers = await res.json();
        setUsers(fetchedUsers);
      } catch (err) {
        // not sure
      }
    }

    fetchUsers()

    return () => controller.abort();
  }, [])

  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.id}>
            <td>
              {user.email}
            </td>
            <td>
              <button
                disabled={userEmail === user.email}
                onClick={() => handleClick(user.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
