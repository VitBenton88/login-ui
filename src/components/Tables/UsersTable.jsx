import { useCallback, useEffect, useState } from "react"
import Loader from '../Loader'
import { useSession } from '../../contexts/SessionContext'
import { useNotification } from '../../contexts/NotificationContext'
import { deleteUserById, getAllUsers } from '../../api'

const PAGE_SIZE = 50

export default function UsersTable() {
  const { userId } = useSession()
  const { notify } = useNotification()

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleClick = useCallback(id => {
    const controller = new AbortController();
    const deleteUser = async (userId = id) => {
      try {
        await deleteUserById(userId, controller.signal);

        setUsers(prev => prev.filter(({ id }) => id !== userId))
        setTotal(prev => prev - 1)
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
        const { data, total: fetchedTotal } = await getAllUsers({ limit: PAGE_SIZE, offset: 0 }, controller.signal);
        setUsers(data);
        setTotal(fetchedTotal);
        setOffset(data.length);
      } catch (err) {
        notify(err.cause?.status === 403 ? 'You no longer have permission to view users.' : err.message, 'error')
      } finally {
        setLoading(false);
      }
    }

    fetchUsers()

    return () => controller.abort();
  }, [])

  const loadMore = useCallback(() => {
    const controller = new AbortController();
    const fetchMore = async () => {
      setLoadingMore(true)
      try {
        const { data, total: fetchedTotal } = await getAllUsers({ limit: PAGE_SIZE, offset }, controller.signal);
        setUsers(prev => [...prev, ...data]);
        setTotal(fetchedTotal);
        setOffset(prev => prev + data.length);
      } catch (err) {
        notify(err.cause?.status === 403 ? 'You no longer have permission to view users.' : err.message, 'error')
      } finally {
        setLoadingMore(false);
      }
    }

    fetchMore()

    return () => controller.abort();
  }, [offset])

  if (loading) return <Loader />

  return (
    <>
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
      {offset < total && (
        <button type="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Load more (${total - offset} remaining)`}
        </button>
      )}
    </>
  );
}
