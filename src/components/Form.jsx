import FormNav from '../components/Navs/FormNav'
import RegisterForm from '../components/Forms/RegisterForm'
import LoginForm from '../components/Forms/LoginForm'
import { useFormContext } from '../contexts/FormContext'

export default function Main() {
  const { showLogin } = useFormContext()

  const Form = showLogin ? <LoginForm /> : <RegisterForm />

  return (
    <>
      <FormNav />
      {Form}
    </>
  )
}
