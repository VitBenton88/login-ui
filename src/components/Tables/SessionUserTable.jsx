import { useSession } from '../../contexts/SessionContext'

export default function LogsTable() {
  const { userCreated, userEmail } = useSession()

  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            {userEmail}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
