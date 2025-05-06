import { useSession } from '../../contexts/SessionContext'

export default function UserForm() {
  const { email } = useSession()

  return (
    <>
      <p>{email}</p>
    </>
  );
}
