import { useEffect, useState } from "react"
import Loader from './Loader'
import { useNotification } from '../contexts/NotificationContext'
import { getAllLogs } from '../api'

export default function LogsTable() {
  const { notify } = useNotification()

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLogs = async () => {
      try {
        const fetchedLogs = await getAllLogs(controller.signal);
        setLogs(fetchedLogs);
      } catch (err) {
        notify(err.cause || err.message, 'error')
      } finally {
        setLoading(false);
      }
    }

    fetchLogs()

    return () => controller.abort();
  }, [])

  if (loading) return <Loader />

  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Success</th>
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
              {log.timestamp}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
