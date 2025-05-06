import { useSession } from '../../contexts/SessionContext'

export default function UserForm() {
  const { userEmail } = useSession()

  return (
    <>
      <p>Email: {userEmail}</p>
    </>
  );
}
