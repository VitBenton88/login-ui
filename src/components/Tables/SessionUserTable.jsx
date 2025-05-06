import { useSession } from '../../contexts/SessionContext'

export default function LogsTable() {
  const { user } = useSession()

  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            {user.email}
          </td>
          <td>
            {user.created}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
