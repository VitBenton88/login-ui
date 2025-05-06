export const registrationErrors = {
  400: 'Invalid request. Please check the form for errors.',
  401: 'You must be logged in to perform this action.',
  403: 'You are not allowed to register with these credentials.',
  404: 'Registration service not found. Please try again later.',
  409: 'An account with this email already exists.',
  422: 'Some fields are invalid or missing. Please correct them and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
  default: 'An unexpected error occurred during registration.'
}

export const loginErrors = {
  400: 'Invalid login request. Please check your input.',
  401: 'Incorrect email or password.',
  403: 'Your account is not authorized to log in.',
  404: 'Account not found. Please register first.',
  409: 'This account is already logged in elsewhere.',
  429: 'Too many login attempts. Please try again later.',
  default: 'An unexpected error occurred during login. Please try again.',
}

export const updateErrors = {
  400: 'Invalid update request. Please check your input.',
  401: 'Incorrect details provided.',
  403: 'Your account is not authorized for this operation.',
  404: 'Account not found. Please register first.',
  409: 'This account is already logged in elsewhere.',
  429: 'Too many update attempts. Please try again later.',
  default: 'An unexpected error occurred. Please try again.',
}
