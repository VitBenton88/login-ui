import { useRef } from 'react'
import { useNotification } from '../../contexts/NotificationContext'
import { useSession } from '../../contexts/SessionContext'

export default function LoginForm() {
  const emailRef = useRef()
  const passwordRef = useRef()

  const { notify } = useNotification()
  const { login } = useSession()

  const handleSubmit = async e => {
    e.preventDefault()

    const email = emailRef.current.value
    const password = passwordRef.current.value

    try {
      await login(email, password)
      notify('Successfully logged in!', 'success')
    } catch (err) {
      console.error(err)
      notify(err.cause || err.message, 'error')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend>Login</legend>

        <div>
          <label htmlFor="email">Email:</label>
          <br />
          <input type="text" id="email" ref={emailRef} />
        </div>

        <div>
          <label htmlFor="password">Password:</label>
          <br />
          <input type="password" id="password" ref={passwordRef} />
        </div>

        <br />

        <button type="submit">Login</button>
      </fieldset>
    </form>
  )
}
