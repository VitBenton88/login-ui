import UserNav from '../components/navigations/UserNav'

export default function ProtectedApp() {
  return (
    <>
      <UserNav />
      <p>You’re in a private area!</p>
    </>
  )
}
