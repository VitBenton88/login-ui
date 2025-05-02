import { useRef } from 'react'
import { useNotification } from '../../contexts/NotificationContext'
import { registrationErrors } from '../../Constants'

export default function Register() {
  const emailRef = useRef()
  const passwordRef = useRef()
  const { notify } = useNotification()

  const clearForm = () => {
    emailRef.current.value = ""
    passwordRef.current.value = ""
  }

  const handleSubmit = async e => {
    e.preventDefault()

    const email = emailRef.current.value
    const password = passwordRef.current.value

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const cause = registrationErrors[response.status] || registrationErrors.default
        throw new Error('Registration failed', { cause })
      }

      notify('Successfully registered!', 'success')
      clearForm()
    } catch (err) {
      console.error(err)
      notify(err.cause || err.message, 'error')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend>Registration</legend>

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

        <button type="submit">Register</button>
      </fieldset>
    </form>
  )
}
