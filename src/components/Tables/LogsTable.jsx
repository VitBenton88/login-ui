import { useCallback, useEffect, useState } from "react"
import Loader from '../Loader'
import { useNotification } from '../../contexts/NotificationContext'
import { getAllLogs } from '../../api'

const PAGE_SIZE = 50

export default function LogsTable() {
  const { notify } = useNotification()

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLogs = async () => {
      try {
        const { data, total: fetchedTotal } = await getAllLogs({ limit: PAGE_SIZE, offset: 0 }, controller.signal);
        setLogs(data);
        setTotal(fetchedTotal);
        setOffset(data.length);
      } catch (err) {
        notify(err.cause?.status === 403 ? 'You no longer have permission to view logs.' : err.message, 'error')
      } finally {
        setLoading(false);
      }
    }

    fetchLogs()

    return () => controller.abort();
  }, [])

  const loadMore = useCallback(() => {
    const controller = new AbortController();
    const fetchMore = async () => {
      setLoadingMore(true)
      try {
        const { data, total: fetchedTotal } = await getAllLogs({ limit: PAGE_SIZE, offset }, controller.signal);
        setLogs(prev => [...prev, ...data]);
        setTotal(fetchedTotal);
        setOffset(prev => prev + data.length);
      } catch (err) {
        notify(err.cause?.status === 403 ? 'You no longer have permission to view logs.' : err.message, 'error')
      } finally {
        setLoadingMore(false);
      }
    }

    fetchMore()

    return () => controller.abort();
  }, [offset])

  if (loading) return <Loader />
  if (!logs.length) return <p>No logs found.</p>

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Success</th>
            <th>Message</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>
                {log.email}
              </td>
              <td>
                {log.success ? '✅' : '❌'}
              </td>
              <td>
                {log.message}
              </td>
              <td>
                {log.timestamp}
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
