import { useCallback, useEffect, useState } from "react"
import Loader from '../Loader'
import { useSession } from '../../contexts/SessionContext'
import { useNotification } from '../../contexts/NotificationContext'
import { deleteUserById, getAllUsers } from '../../api'

export default function UsersTable() {
  const { userId } = useSession()
  const { notify } = useNotification()

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleClick = useCallback(id => {
    const controller = new AbortController();
    const deleteUser = async (userId = id) => {
      try {
        await deleteUserById(userId, controller.signal);

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
        const fetchedUsers = await getAllUsers(controller.signal);
        setUsers(fetchedUsers);
      } catch (err) {
        // Belt-and-suspenders: ProtectedApp no longer mounts this component
        // for non-admins, but an admin's session could be downgraded
        // mid-visit (e.g. ADMIN_EMAILS changed server-side).
        notify(err.cause?.status === 403 ? 'You no longer have permission to view users.' : err.message, 'error')
      } finally {
        setLoading(false);
      }
    }

    fetchUsers()

    return () => controller.abort();
  }, [])

  if (loading) return <Loader />

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
                disabled={userId === user.id}
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
