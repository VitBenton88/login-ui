import { useFormContext } from '../../contexts/FormContext'

export default function FormNav() {
  const { showLogin, setShowLogin } = useFormContext()

  const handleClick = () => setShowLogin(prev => !prev)

  return (
    <header>
      <nav role="tablist" aria-label="Select form">
        <button
          role="tab"
          aria-selected={!showLogin}
          tabIndex="0"
          disabled={showLogin}
          onClick={handleClick}
        >
          Login
        </button>
        <button
          role="tab"
          aria-selected={showLogin}
          tabIndex="1"
          disabled={!showLogin}
          onClick={handleClick}
        >
          Register
        </button>
      </nav>
    </header>
  );
}
