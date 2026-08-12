import { loginErrors, registrationErrors, updateErrors } from './util/constants'

// Two error conventions coexist below, matching what each endpoint needs:
// - Endpoints with curated per-status copy (login/registration/update) throw
//   with `cause: <string>` — the message meant to be shown to the user.
// - Endpoints callers need to branch on programmatically (session/list
//   endpoints) throw with `cause: { status }` instead.

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

export async function getAllLogs({ limit, offset } = {}, signal) {
  const params = new URLSearchParams()
  if (limit != null) params.set('limit', limit)
  if (offset != null) params.set('offset', offset)
  const query = params.toString()

  const response = await fetch(`${API_BASE_URL}/logs${query ? `?${query}` : ''}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.error || 'Failed to fetch all logs.', {
      cause: { status: response.status }
    });
  }

  return jsonResponse;
}

// /auth/refresh is entirely cookie-driven — simple-auth's refreshHandler
// never reads the Authorization header, so it was dead weight here.
//
// Concurrent callers share one in-flight request instead of each firing
// their own: refreshHandler rotates the refresh token on every use, so a
// second real request racing the first would find its own token already
// spent by the time it lands.
let refreshPromise = null

export function getRefreshToken(signal) {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends the httpOnly refreshToken cookie
      signal
    });
    const jsonResponse = await response.json();

    if (!response.ok) {
      throw new Error(jsonResponse?.error || 'Failed to get refresh token.', {
        cause: { status: response.status }
      });
    }

    return jsonResponse;
  })()

  refreshPromise = refreshPromise.finally(() => { refreshPromise = null })

  return refreshPromise;
}

export async function getAllUsers({ limit, offset } = {}, signal) {
  const params = new URLSearchParams()
  if (limit != null) params.set('limit', limit)
  if (offset != null) params.set('offset', offset)
  const query = params.toString()

  const response = await fetch(`${API_BASE_URL}/users${query ? `?${query}` : ''}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.error || 'Failed to fetch all users.', {
      cause: { status: response.status }
    });
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
    throw new Error(jsonResponse?.error || 'Failed to fetch session user data.', {
      cause: { status: response.status }
    });
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
