import { useRef } from 'react'
import { useNotification } from '../../contexts/NotificationContext'
import { useSession } from '../../contexts/SessionContext'
import { loginErrors } from '../../Constants'

export default function Login() {
  const emailRef = useRef()
  const passwordRef = useRef()

  const { notify } = useNotification()
  const { fetchSession } = useSession()

  const clearForm = () => {
    emailRef.current.value = ""
    passwordRef.current.value = ""
  }

  const handleSubmit = async e => {
    e.preventDefault()

    const email = emailRef.current.value
    const password = passwordRef.current.value

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const cause = loginErrors[response.status] || loginErrors.default
        throw new Error('Login failed', { cause })
      }

      notify('Successfully logged in!', 'success')
      clearForm()
      fetchSession()
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
