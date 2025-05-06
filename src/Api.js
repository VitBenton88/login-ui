import { loginErrors, registrationErrors, updateErrors } from './util/constants'

export async function getUserbyId(userId, signal) {
  const response = await fetch(`/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.message || 'Failed to fetch user.');
  }

  return jsonResponse;
}

export async function deleteUserById(userId, signal) {
  const response = await fetch(`/users/delete/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
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
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
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
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
    signal
  });
  const jsonResponse = await response.json();

  if (!response.ok) {
    throw new Error(jsonResponse?.message || 'Failed to fetch all users.');
  }

  return jsonResponse;
}

export async function updateUserEmailbyId(id, email) {
  const response = await fetch(`/users/update/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  })

  if (!response.ok) {
    const cause = updateErrors[response.status] || updateErrors.default
    throw new Error('User update failed.', { cause })
  }
}

export async function registerUser(email, password) {
  const response = await fetch('/users/create', {
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
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    },
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

  localStorage.setItem('accessToken', jsonResponse.accessToken);

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
