import FormNav from '../components/navigations/FormNav'
import Register from '../components/forms/Register'
import Login from '../components/forms/Login'
import { useFormContext } from '../contexts/FormContext'

export default function Main() {
  const { showLogin } = useFormContext()

  const Form = showLogin ? <Login /> : <Register />

  return (
    <>
      <FormNav />
      {Form}
    </>
  )
}
