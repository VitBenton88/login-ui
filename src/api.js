import { loginErrors, registrationErrors, updateErrors } from './util/constants'

// Empty by default: relative paths resolve against Vite's dev proxy (see
// vite.config.js) or against this app's own origin if it's served from the
// same origin as simple-auth in production. Set VITE_API_URL at build time
// when simple-auth is hosted elsewhere (e.g. a subdomain), and see the
// README for the same-parent-domain requirement that comes with it — the
// refresh cookie is SameSite=Strict, so this app and simple-auth must share
// a parent domain no matter what this is set to.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function getUserbyId(userId, signal) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.error || 'Failed to fetch user.');
  }

  return jsonResponse;
}

export async function deleteUserById(userId, signal) {
  const response = await fetch(`${API_BASE_URL}/users/delete/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });

  if (!response.ok) {
    // Failure responses still carry a JSON body; success is a 204 with none.
    const jsonResponse = await response.json().catch(() => null);
    throw new Error(jsonResponse?.error || 'Failed to delete user.');
  }

  return null;
}

export async function getAllLogs(signal) {
  const response = await fetch(`${API_BASE_URL}/logs`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.error || 'Failed to fetch all logs.');
  }

  return jsonResponse;
}

export async function getRefreshToken(signal) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // sends the httpOnly refreshToken cookie
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.error || 'Failed to get refresh token.');
  }

  return jsonResponse;
}

export async function getAllUsers(signal) {
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.error || 'Failed to fetch all users.');
  }

  return jsonResponse;
}

export async function updateUserEmailbyId(id, email) {
  const response = await fetch(`${API_BASE_URL}/users/update/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    body: JSON.stringify({ email })
  })

  if (!response.ok) {
    const cause = updateErrors[response.status] || updateErrors.default
    throw new Error('User update failed.', { cause })
  }
}

export async function registerUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/users/create`, {
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
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status} ${jsonResponse?.error}` || 'Failed to fetch session user data.');
  }

  return jsonResponse;
}

export async function userLogin(email, password, signal) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include', // stores the httpOnly refreshToken cookie the response sets
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

  localStorage.setItem('accessToken', jsonResponse.accessToken);

  return jsonResponse;
}

export async function userLogout(signal) {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include', // sends the refreshToken cookie so the server can revoke it
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  })
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error('User logout failed.')
  }

  return jsonResponse;
}
