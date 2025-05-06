import { loginErrors, registrationErrors } from './Constants'

export async function deleteUserById(userId, signal) {
  const response = await fetch(`/users/delete/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.message || 'Failed to delete user.');
  }

  return jsonResponse;
}

export async function getAllLogs(signal) {
  const response = await fetch('/logs', {
    credentials: 'include',
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.message || 'Failed to fetch all logs.');
  }

  return jsonResponse;
}

export async function getAllUsers(signal) {
  const response = await fetch('/users', {
    credentials: 'include',
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.message || 'Failed to fetch all users.');
  }

  return jsonResponse;
}

export async function registerUser(email, password) {
  const response = await fetch('/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const cause = registrationErrors[response.status] || registrationErrors.default
    throw new Error('Registration failed.', { cause })
  }
}

export async function getSessionUserInfo(signal) {
  const response = await fetch('/auth/me', {
    credentials: 'include',
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.message || 'Failed to fetch session user data.');
  }

  return jsonResponse;
}

export async function userLogin(email, password, signal) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password }),
    signal
  })
  const jsonResponse = await response.json();

  if (!response.ok) {
    const cause = loginErrors[response.status] || loginErrors.default
    throw new Error('User login failed.', { cause })
  }

  return jsonResponse;
}

export async function userLogout(signal) {
  const response = await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'include',
    signal
  })
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error('User logout failed.')
  }

  return jsonResponse;
}
