# Tier 2 (UX / Data-Integrity Gaps) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement items 9–13 from `login-ui`'s Tier 2 audit (`/private/tmp/claude-501/-Users-vitbenton-Desktop-Repos-login-ui/88ab72fe-f92b-4c55-b914-10fe95217643/scratchpad/login-ui-auth-audit.md`): surface admin status to the client, paginate the admin list views, and make `SessionContext` fail predictably instead of silently.

**Architecture:** Two of the four tasks are coordinated cross-repo changes (`simple-auth` server + `login-ui` client shipped together); the other two are `login-ui`-only. Follow the audit's own sequencing: admin signal first (unblocks a UX simplification everything else benefits from), then `SessionContext` resilience, then the breaking pagination shape change, then multi-tab coordination last.

**Tech Stack:** React 19 (`login-ui`, no test runner — verify via `npm run lint` / `npm run build` / manual dev-server check, matching how Tier 0/1 shipped), Express 5 + `node:test` (`simple-auth`, has a real test suite — add tests there following existing patterns in `test/*.test.js`).

## Global Constraints

- `login-ui`'s `main` is not lint-clean today: `npm run lint` currently reports 4 pre-existing errors. Two are fixed in-scope by this plan (`src/api.js:137`'s `no-constant-binary-expression`, by Task 2 Step 1; `src/components/ProtectedApp.jsx`'s unused `showUpdateForm` state, by Task 1 Step 8, updated below). The other two — `src/components/Navs/UserNav.jsx:8`'s unused `e` parameter, and any `react-hooks/exhaustive-deps` *warnings* (not errors) — are outside every Tier 2 item's file list and out of scope; do not fix them opportunistically. Every task's lint-verification step below means "no *new* errors beyond `UserNav.jsx`'s pre-existing one," not a fully clean run until Task 2 lands.
- `login-ui` has no test framework installed (`package.json` has no test script) — Tier 0/1 shipped without adding one; Tier 2 follows the same convention. Every `login-ui` step's "test" is `npm run lint` + `npm run build`, plus a manual dev-server check described in the step.
- `simple-auth` has `node --test` with an established per-file pattern (see `test/pagination.test.js`, `test/auth-routes.test.js`): a `uniqueEmail()` helper, a `startServer()` helper returning `{ server, base }`, real `fetch()` calls against an ephemeral port, `server.close()` in a `finally`. New tests must follow this pattern, not invent a new one.
- Cross-repo tasks (1 and 3) commit to `simple-auth` first, run its full `npm test`, then commit to `login-ui`. Never leave the two repos with an incompatible API shape between commits longer than one task.
- `simple-auth` lives at `/Users/vitbenton/Desktop/Repos/simple-auth` (sibling repo, separate git history/remote).
- Preserve each file's existing style exactly (semicolon usage varies file-to-file in `login-ui` — match the file being edited, don't impose one convention across the codebase).

---

## Task 1: Admin signal on the client (item 9)

**Files:**
- Modify (`simple-auth`): `routes/middleware.js`, `routes/auth.js`, `test/auth-routes.test.js`
- Modify (`login-ui`): `src/api.js`, `src/contexts/SessionContext.jsx`, `src/components/ProtectedApp.jsx`, `src/components/Tables/UsersTable.jsx`, `src/components/Tables/LogsTable.jsx`

**Interfaces:**
- Produces: `GET /auth/me` now returns `{ id, email, isAdmin, created }` (was `{ id }`). `useSession()`'s `user` object gains a third field, `isAdmin: boolean`, alongside the existing `email`/`created`. Later tasks (2, 3, 4) build on this `user.isAdmin` field and on the `{ status }`-shaped `cause` convention introduced here for `getAllUsers`/`getAllLogs`.

- [ ] **Step 1: `simple-auth` — carry `created` onto `req.user`**

In `/Users/vitbenton/Desktop/Repos/simple-auth/routes/middleware.js`, `requireAuth` already looks up the full user row via `getById` but drops everything except `id`/`email`. Change line 47 from:

```js
  req.user = { id: user.id, email: user.email, isAdmin: isAdminEmail(user.email) };
```

to:

```js
  req.user = { id: user.id, email: user.email, isAdmin: isAdminEmail(user.email), created: user.created };
```

- [ ] **Step 2: `simple-auth` — `meHandler` returns the full shape**

In `/Users/vitbenton/Desktop/Repos/simple-auth/routes/auth.js`, replace:

```js
export function meHandler(req, res) {
  res.json({ id: req.user.id });
}
```

with:

```js
export function meHandler(req, res) {
  const { id, email, isAdmin, created } = req.user;
  res.json({ id, email, isAdmin, created });
}
```

- [ ] **Step 3: `simple-auth` — write the failing tests**

Append to `/Users/vitbenton/Desktop/Repos/simple-auth/test/auth-routes.test.js` (it already imports `register` from `../services/users.js`, and has `uniqueEmail`/`startServer` helpers — reuse them):

```js
test('GET /auth/me returns email and created alongside id, with isAdmin false for a non-admin', async () => {
  const { server, base } = await startServer();

  try {
    const email = uniqueEmail('me-shape');
    await register(email, 'a-strong-password');

    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'a-strong-password' }),
    });
    const { accessToken } = await loginRes.json();

    const meRes = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await meRes.json();

    assert.equal(meRes.status, 200);
    assert.equal(body.email, email);
    assert.equal(body.isAdmin, false);
    assert.equal(typeof body.created, 'string');
  } finally {
    server.close();
  }
});

test('GET /auth/me reports isAdmin true for an ADMIN_EMAILS address', async () => {
  const { server, base } = await startServer();
  const originalAdmins = process.env.ADMIN_EMAILS;

  try {
    const email = uniqueEmail('me-admin');
    await register(email, 'a-strong-password');
    process.env.ADMIN_EMAILS = email;

    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'a-strong-password' }),
    });
    const { accessToken } = await loginRes.json();

    const meRes = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await meRes.json();

    assert.equal(body.isAdmin, true);
  } finally {
    process.env.ADMIN_EMAILS = originalAdmins;
    server.close();
  }
});
```

- [ ] **Step 4: `simple-auth` — run the suite**

```bash
cd /Users/vitbenton/Desktop/Repos/simple-auth && npm test
```

Expected: all tests pass, including the two new ones.

- [ ] **Step 5: `simple-auth` — commit**

```bash
cd /Users/vitbenton/Desktop/Repos/simple-auth
git add routes/middleware.js routes/auth.js test/auth-routes.test.js
git commit -m "Include email, isAdmin, and created on GET /auth/me

login-ui needs isAdmin to decide what to render, and email/created to
drop a redundant second round trip it was making just to fetch them.
requireAuth already looked these up via getById for isAdmin; meHandler
just wasn't passing them through."
```

- [ ] **Step 6: `login-ui` — add `{ status }` cause to `getAllUsers`/`getAllLogs`**

In `/Users/vitbenton/Desktop/Repos/login-ui/src/api.js`, add a short comment above `API_BASE_URL` documenting the two error-shape conventions that now coexist (needed before Step 9 uses it):

```js
// Two error conventions coexist below, matching what each endpoint needs:
// - Endpoints with curated per-status copy (login/registration/update) throw
//   with `cause: <string>` — the message meant to be shown to the user.
// - Endpoints callers need to branch on programmatically (session/list
//   endpoints) throw with `cause: { status }` instead.
```

Then update `getAllLogs` and `getAllUsers` to attach `cause: { status: response.status }`:

```js
export async function getAllLogs(signal) {
  const response = await fetch(`${API_BASE_URL}/logs`, {
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
```

```js
export async function getAllUsers(signal) {
  const response = await fetch(`${API_BASE_URL}/users`, {
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
```

(Task 3 will change these functions' signatures further — this step only adds `cause`.)

- [ ] **Step 7: `login-ui` — `SessionContext` consumes the new `/auth/me` shape, drops the second round trip**

Replace `/Users/vitbenton/Desktop/Repos/login-ui/src/contexts/SessionContext.jsx` in full with:

```jsx
import { createContext, useReducer, useContext, useEffect, useState, useCallback } from 'react'
import { getRefreshToken, getSessionUserInfo, updateUserEmailbyId, userLogin, userLogout } from '../api'

const SessionContext = createContext()

function userReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {
        email: action.payload.email,
        created: action.payload.created,
        isAdmin: action.payload.isAdmin
      };
    case 'CLEAR_USER':
      return { email: '', created: '', isAdmin: false };
    default:
      return state;
  }
}

const initialUserState = {
  email: '',
  created: '',
  isAdmin: false
}

export function SessionProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [user, userDispatch] = useReducer(userReducer, initialUserState)

  const fetchSession = useCallback(async () => {
    try {
      const { id, email, created, isAdmin } = await getSessionUserInfo()
      setUserId(id)
      userDispatch({ type: 'SET_USER', payload: { email, created, isAdmin } })
      setIsLoggedIn(true)
    } catch (error) {
      if (error?.message.includes('401')) {
        try {
          const { accessToken } = await getRefreshToken();
          localStorage.setItem('accessToken', accessToken);
          return await fetchSession();
        } catch {
          setLoading(false)
          return
        }
      }

      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [])

  const login = async (email, password) => {
    try {
      setLoading(true)
      await userLogin(email, password)
      setIsLoggedIn(true)
      await fetchSession()
    } catch (error) {
      console.error(error)
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateEmail = useCallback(async (id, email) => {
    try {
      setLoading(true)
      await updateUserEmailbyId(id, email)
    } catch (error) {
      console.log(error);
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await userLogout()
      localStorage.removeItem('accessToken')
      userDispatch({ type: 'CLEAR_USER' })
      setIsLoggedIn(false)
    } catch (error) {
      throw new Error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <SessionContext.Provider value={{ isLoggedIn, logout, loading, login, userId, updateEmail, user }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
```

This removes `getUserbyId`/`fetchUser` and the `userId`-triggered `useEffect` entirely — `/auth/me` now supplies everything in one call. (Task 2 will rework `fetchSession`'s throw/swallow behavior further; this step only changes what it reads and dispatches.)

- [ ] **Step 8: `login-ui` — gate the admin section in `ProtectedApp`**

Replace `/Users/vitbenton/Desktop/Repos/login-ui/src/components/ProtectedApp.jsx` in full with:

```jsx
import UserNav from './Navs/UserNav'
import LogsTable from './Tables/LogsTable'
import UserProfile from './UserProfile'
import UsersTable from './Tables/UsersTable'
import { useSession } from '../contexts/SessionContext'

export default function ProtectedApp() {
  const { user } = useSession()

  return (
    <>
      <UserNav />
      <h2>User profile:</h2>
      <UserProfile />
      {user.isAdmin && (
        <>
          <h2>System info:</h2>
          <h3>Users</h3>
          <UsersTable />
          <h3>Logs</h3>
          <LogsTable />
        </>
      )}
    </>
  )
}
```

This also drops the `showUpdateForm`/`setShowUpdateForm` state and its `useState` import — dead code already flagged by `npm run lint` on `main` today (`no-unused-vars`), never read anywhere in this component. Removing it here, since this step already rewrites the whole file, clears that pre-existing error as a side effect.

- [ ] **Step 9: `login-ui` — defensive 403 messaging in `UsersTable`/`LogsTable`**

In `/Users/vitbenton/Desktop/Repos/login-ui/src/components/Tables/UsersTable.jsx`, in the fetch effect's `catch` block, replace:

```js
      } catch (err) {
        notify(err.cause || err.message, 'error')
      } finally {
```

with:

```js
      } catch (err) {
        // Belt-and-suspenders: ProtectedApp no longer mounts this component
        // for non-admins, but an admin's session could be downgraded
        // mid-visit (e.g. ADMIN_EMAILS changed server-side).
        notify(err.cause?.status === 403 ? 'You no longer have permission to view users.' : err.message, 'error')
      } finally {
```

(Leave the `handleClick`/delete `catch` block — `notify(err.cause || err.message, 'error')` — untouched; `deleteUserById` doesn't set `cause`, so it already resolves to the real server message.)

In `/Users/vitbenton/Desktop/Repos/login-ui/src/components/Tables/LogsTable.jsx`, apply the same change to its one `catch` block:

```js
      } catch (err) {
        notify(err.cause?.status === 403 ? 'You no longer have permission to view logs.' : err.message, 'error')
      } finally {
```

- [ ] **Step 10: `login-ui` — verify**

```bash
cd /Users/vitbenton/Desktop/Repos/login-ui
npm run lint
npm run build
```

Expected: both succeed. `npm run lint` should now report 3 errors, not the original 4 — this step's `ProtectedApp.jsx` rewrite clears the pre-existing `no-unused-vars` one. The remaining 3 (`api.js:137`'s `no-constant-binary-expression`, `UserNav.jsx:8`'s unused `e`, plus warnings) are pre-existing and out of scope for this task; `api.js:137` is fixed in Task 2.

Then manually check with both repos running (`npm run dev` in each, `simple-auth` on its usual port): register two accounts, set `ADMIN_EMAILS` in `simple-auth`'s env to one of them, log in as the non-admin — confirm no "System info" section renders. Log in as the admin — confirm it does, and the users/logs tables load.

- [ ] **Step 11: `login-ui` — commit**

```bash
cd /Users/vitbenton/Desktop/Repos/login-ui
git add src/api.js src/contexts/SessionContext.jsx src/components/ProtectedApp.jsx src/components/Tables/UsersTable.jsx src/components/Tables/LogsTable.jsx
git commit -m "Gate admin views on isAdmin, drop redundant session round trip (Tier 2)

/auth/me now returns email/isAdmin/created (see simple-auth commit),
so SessionContext no longer needs a second fetchUser(id) call just to
get email/created. ProtectedApp now reads user.isAdmin to decide
whether to render the Users/Logs admin section at all, instead of
rendering it for everyone and letting non-admins hit a 403 that looked
identical to an empty list. Kept a defensive 403 message in both
tables' catch blocks in case an admin's session is downgraded
mid-visit.

Item 9 of the Tier 2 audit."
```

---

## Task 2: `SessionContext` resilience (items 11 + 12)

**Files:**
- Modify (`login-ui`): `src/api.js`, `src/App.jsx`, `src/contexts/SessionContext.jsx`

**Interfaces:**
- Consumes: `user.isAdmin`/`email`/`created` reducer shape from Task 1; the `cause: { status }` convention from Task 1.
- Produces: `fetchSession()` now returns `boolean` (`true` on confirmed success, `false` otherwise) instead of sometimes throwing, sometimes swallowing. `login()` only flips `isLoggedIn` true via `fetchSession`'s own internal call, never optimistically. Task 4 builds directly on this version of `fetchSession`.

- [ ] **Step 1: `login-ui` — fix `getSessionUserInfo`'s unreachable fallback, add `cause`**

In `/Users/vitbenton/Desktop/Repos/login-ui/src/api.js`, replace:

```js
  if (!response.ok) {
    throw new Error(`${response.status} ${jsonResponse?.error}` || 'Failed to fetch session user data.');
  }
```

with:

```js
  if (!response.ok) {
    throw new Error(jsonResponse?.error || 'Failed to fetch session user data.', {
      cause: { status: response.status }
    });
  }
```

(The template literal was never falsy — `'500 undefined'` was a real value that could render to a user. `fetchSession`'s `error.message.includes('401')` check, fixed in Step 3 below, was the only thing relying on the old embedded-status-in-message hack.)

- [ ] **Step 2: `login-ui` — add `cause` to `getRefreshToken`**

In `/Users/vitbenton/Desktop/Repos/login-ui/src/api.js`, replace:

```js
  if (!response.ok) {
    throw new Error(jsonResponse?.error || 'Failed to get refresh token.');
  }
```

(inside `getRefreshToken`) with:

```js
  if (!response.ok) {
    throw new Error(jsonResponse?.error || 'Failed to get refresh token.', {
      cause: { status: response.status }
    });
  }
```

- [ ] **Step 3: `login-ui` — reorder providers so `SessionContext` can call `notify`**

`SessionContext` needs to raise toasts (429 rate-limit, unexpected failures) but `App.jsx` currently nests `NotificationProvider` *inside* `SessionProvider`, so `NotificationContext` isn't available to `SessionProvider`'s own body. Swap the nesting in `/Users/vitbenton/Desktop/Repos/login-ui/src/App.jsx`:

```jsx
import './App.css'
import Notification from './components/Notification'
import Main from './components/Main'
import { NotificationProvider } from './contexts/NotificationContext'
import { SessionProvider } from './contexts/SessionContext'

export default function App() {
  return (
    <NotificationProvider>
      <SessionProvider>
        <Notification />
        <Main />
      </SessionProvider>
    </NotificationProvider>
  )
}
```

`Notification` and `Main` (and everything under it) still sit inside both providers, so nothing else changes behavior.

- [ ] **Step 4: `login-ui` — rewrite `fetchSession`/`login` in `SessionContext`**

Replace `/Users/vitbenton/Desktop/Repos/login-ui/src/contexts/SessionContext.jsx` in full with:

```jsx
import { createContext, useReducer, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { getRefreshToken, getSessionUserInfo, updateUserEmailbyId, userLogin, userLogout } from '../api'
import { useNotification } from './NotificationContext'

const SessionContext = createContext()

function userReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {
        email: action.payload.email,
        created: action.payload.created,
        isAdmin: action.payload.isAdmin
      };
    case 'CLEAR_USER':
      return { email: '', created: '', isAdmin: false };
    default:
      return state;
  }
}

const initialUserState = {
  email: '',
  created: '',
  isAdmin: false
}

export function SessionProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [user, userDispatch] = useReducer(userReducer, initialUserState)
  const { notify } = useNotification()
  const hasRetriedRef = useRef(false)

  // Resolves true only once /auth/me has actually confirmed a session —
  // never throws, so callers always get a definitive answer instead of a
  // mix of thrown errors and silently-swallowed failures.
  const fetchSession = useCallback(async () => {
    try {
      const { id, email, created, isAdmin } = await getSessionUserInfo()
      setUserId(id)
      userDispatch({ type: 'SET_USER', payload: { email, created, isAdmin } })
      setIsLoggedIn(true)
      hasRetriedRef.current = false
      return true
    } catch (error) {
      if (error.cause?.status === 401 && !hasRetriedRef.current) {
        hasRetriedRef.current = true

        try {
          const { accessToken } = await getRefreshToken();
          localStorage.setItem('accessToken', accessToken);
          return await fetchSession()
        } catch (refreshError) {
          hasRetriedRef.current = false

          if (refreshError.cause?.status === 429) {
            notify('Too many attempts. Please wait a moment and try again.', 'error')
          }
          // A plain 401 here just means "not logged in" (e.g. first visit,
          // or a naturally expired session) — no toast, straight to the
          // login screen.

          setIsLoggedIn(false)
          return false
        }
      }

      hasRetriedRef.current = false

      if (error.cause?.status !== 401) {
        notify(error.message, 'error')
      }

      setIsLoggedIn(false)
      return false
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchSession().catch(error => notify(error.message, 'error'))
  }, [])

  const login = async (email, password) => {
    try {
      setLoading(true)
      await userLogin(email, password)
      const succeeded = await fetchSession()

      if (!succeeded) {
        throw new Error('Logged in, but failed to load your session. Please try again.')
      }
    } catch (error) {
      console.error(error)
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateEmail = useCallback(async (id, email) => {
    try {
      setLoading(true)
      await updateUserEmailbyId(id, email)
    } catch (error) {
      console.log(error);
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await userLogout()
      localStorage.removeItem('accessToken')
      userDispatch({ type: 'CLEAR_USER' })
      setIsLoggedIn(false)
    } catch (error) {
      throw new Error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <SessionContext.Provider value={{ isLoggedIn, logout, loading, login, userId, updateEmail, user }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
```

Key changes from Task 1's version: `error.cause?.status === 401` replaces the `error.message.includes('401')` string hack; a `hasRetriedRef` stops the recursive refresh from looping more than once; a 429 on refresh gets its own toast, a plain 401 stays silent; `fetchSession` always resolves a boolean rather than sometimes throwing; `login()` no longer sets `isLoggedIn` optimistically before `fetchSession()` confirms success — and throws (surfacing to `LoginForm`'s existing error handling) if it doesn't.

- [ ] **Step 5: `login-ui` — verify**

```bash
cd /Users/vitbenton/Desktop/Repos/login-ui
npm run lint
npm run build
```

Expected: both succeed. `npm run lint` should now report only 1 error — `UserNav.jsx:8`'s pre-existing unused `e` parameter, out of scope for this plan — since this step's fix to `getSessionUserInfo` clears the other pre-existing error (`api.js:137`'s `no-constant-binary-expression`).

Then manually: log in normally (confirm no regression), then in devtools clear `localStorage`'s `accessToken` and reload while a valid refresh cookie still exists (confirm silent re-auth still works), then clear both the token and cookies and reload (confirm a clean, toast-free bounce to the login screen).

- [ ] **Step 6: `login-ui` — commit**

```bash
cd /Users/vitbenton/Desktop/Repos/login-ui
git add src/api.js src/App.jsx src/contexts/SessionContext.jsx
git commit -m "Make SessionContext fail predictably instead of swallowing errors (Tier 2)

fetchSession mixed thrown errors with silently-swallowed ones, and the
one place checking for a 401 did it by substring-matching the error
message. Fixed the underlying cause (getSessionUserInfo/getRefreshToken
now attach cause: { status }) and made fetchSession consistently return
a boolean instead: true only once /auth/me has confirmed a session,
false otherwise, never throwing. That lets login() stop setting
isLoggedIn optimistically before the session fetch actually succeeds,
and gives a 429 on refresh (rate-limited) a distinct toast instead of
looking identical to a normal logged-out state. Reordered App.jsx's
providers so SessionContext can reach NotificationContext to raise
those toasts, and added a retry guard so a persistent inconsistency
can't recurse indefinitely.

Items 11 and 12 of the Tier 2 audit."
```

---

## Task 3: List endpoints stop silently truncating at 50 rows (item 10)

**Files:**
- Modify (`simple-auth`): `services/users.js`, `services/logging.js`, `routes/users.js`, `routes/logs.js`, `test/pagination.test.js`
- Modify (`login-ui`): `src/api.js`, `src/components/Tables/UsersTable.jsx`, `src/components/Tables/LogsTable.jsx`

**Interfaces:**
- Produces: `GET /users` and `GET /logs` now return `{ data, total, limit, offset }` (was a bare array). `getAllUsers`/`getAllLogs` in `login-ui` now take `({ limit, offset } = {}, signal)` and return that same envelope, replacing their old `(signal)` signature.

This is a breaking response-shape change — do the `simple-auth` half, test and commit it, then do the `login-ui` half immediately after in the same session so the two repos are never left mismatched for long.

- [ ] **Step 1: `simple-auth` — add `count()` to both services**

In `/Users/vitbenton/Desktop/Repos/simple-auth/services/users.js`, add after `getAll`:

```js
export function count() {
  return usersDb.prepare('SELECT COUNT(*) AS count FROM users').get().count;
}
```

In `/Users/vitbenton/Desktop/Repos/simple-auth/services/logging.js`, add after `getAll`:

```js
export function count() {
  return logsDb.prepare('SELECT COUNT(*) AS count FROM logs').get().count;
}
```

- [ ] **Step 2: `simple-auth` — return the envelope from both list handlers**

In `/Users/vitbenton/Desktop/Repos/simple-auth/routes/users.js`, update the import:

```js
import { deleteById, getAll, getById, register, updateEmailById, count } from '../services/users.js';
```

and `listUsersHandler`:

```js
export function listUsersHandler(req, res) {
  try {
    const { limit, offset } = parsePagination(req.query);
    const data = getAll(limit, offset);
    const total = count();
    return res.json({ data, total, limit, offset });
  } catch (err) {
    createLog('Unknown', 0, `Failed to fetch users: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
}
```

In `/Users/vitbenton/Desktop/Repos/simple-auth/routes/logs.js`, update the import:

```js
import { create as createLog, getById, getAll, count } from '../services/logging.js';
```

and `listLogsHandler`:

```js
export function listLogsHandler(req, res) {
  try {
    const { limit, offset } = parsePagination(req.query);
    const data = getAll(limit, offset);
    const total = count();
    return res.json({ data, total, limit, offset });
  } catch (err) {
    createLog(req.user.email, 0, `Failed to fetch logs: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch logs.' });
  }
}
```

- [ ] **Step 3: `simple-auth` — update the two existing envelope-breaking tests**

In `/Users/vitbenton/Desktop/Repos/simple-auth/test/pagination.test.js`, update the top imports to pull in `count`:

```js
import { register, getAll as getAllUsers, count as countUsers } from '../services/users.js';
import { create as createLogEntry, getAll as getAllLogs, count as countLogs } from '../services/logging.js';
```

Replace the `'GET /users respects a ?limit= query param'` test with:

```js
test('GET /users respects a ?limit= query param and returns a paginated envelope', async () => {
  const { server, base } = await startServer();
  const { accessToken, restoreAdmins } = await loginAsAdmin(base);

  try {
    for (let i = 0; i < 5; i++) {
      await register(uniqueEmail(`route-page-user-${i}`), 'a-strong-password');
    }

    const res = await fetch(`${base}/users?limit=2`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const body = await res.json();

    assert.equal(body.data.length, 2);
    assert.equal(body.limit, 2);
    assert.equal(body.offset, 0);
    assert.equal(body.total, countUsers());
  } finally {
    restoreAdmins();
    server.close();
  }
});
```

Replace the `'GET /logs respects a ?limit= query param'` test with:

```js
test('GET /logs respects a ?limit= query param and returns a paginated envelope', async () => {
  const { server, base } = await startServer();
  const { accessToken, restoreAdmins } = await loginAsAdmin(base);

  try {
    for (let i = 0; i < 5; i++) {
      createLogEntry(uniqueEmail(`route-page-log-${i}`), 1, 'test entry');
    }

    const res = await fetch(`${base}/logs?limit=2`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const body = await res.json();

    assert.equal(body.data.length, 2);
    assert.equal(body.limit, 2);
    assert.equal(body.offset, 0);
    assert.equal(body.total, countLogs());
  } finally {
    restoreAdmins();
    server.close();
  }
});
```

(The `getAllUsers`/`getAllLogs` service-level tests above these, and the `parsePagination` unit tests, are untouched — they never went through the route layer.)

- [ ] **Step 4: `simple-auth` — run the suite**

```bash
cd /Users/vitbenton/Desktop/Repos/simple-auth && npm test
```

Expected: all tests pass.

- [ ] **Step 5: `simple-auth` — commit**

```bash
cd /Users/vitbenton/Desktop/Repos/simple-auth
git add services/users.js services/logging.js routes/users.js routes/logs.js test/pagination.test.js
git commit -m "Return total count alongside paginated list results

GET /users and GET /logs already respected ?limit=/?offset= but
responded with a bare array, giving admins no way to know whether 50
rows was the whole list or a truncated page. Both now respond with
{ data, total, limit, offset }; total comes from a new count() export
on each service, mirroring the existing getAll() pattern."
```

- [ ] **Step 6: `login-ui` — update `getAllUsers`/`getAllLogs` for the new shape**

In `/Users/vitbenton/Desktop/Repos/login-ui/src/api.js`, replace `getAllLogs` with:

```js
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
```

and replace `getAllUsers` with:

```js
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
```

Both now return `{ data, total, limit, offset }`.

- [ ] **Step 7: `login-ui` — `UsersTable` reads `.data`, adds "Load more"**

Replace `/Users/vitbenton/Desktop/Repos/login-ui/src/components/Tables/UsersTable.jsx` in full with:

```jsx
import { useCallback, useEffect, useState } from "react"
import Loader from '../Loader'
import { useSession } from '../../contexts/SessionContext'
import { useNotification } from '../../contexts/NotificationContext'
import { deleteUserById, getAllUsers } from '../../api'

const PAGE_SIZE = 50

export default function UsersTable() {
  const { userId } = useSession()
  const { notify } = useNotification()

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleClick = useCallback(id => {
    const controller = new AbortController();
    const deleteUser = async (userId = id) => {
      try {
        await deleteUserById(userId, controller.signal);

        setUsers(prev => prev.filter(({ id }) => id !== userId))
        setTotal(prev => prev - 1)
        notify('Successfully deleted user.', 'success')
      } catch (err) {
        console.error(err)
        notify(err.cause || err.message, 'error')
      }
    }

    deleteUser()

    return () => controller.abort();
  }, [users])

  useEffect(() => {
    const controller = new AbortController();
    const fetchUsers = async () => {
      try {
        const { data, total: fetchedTotal } = await getAllUsers({ limit: PAGE_SIZE, offset: 0 }, controller.signal);
        setUsers(data);
        setTotal(fetchedTotal);
        setOffset(data.length);
      } catch (err) {
        notify(err.cause?.status === 403 ? 'You no longer have permission to view users.' : err.message, 'error')
      } finally {
        setLoading(false);
      }
    }

    fetchUsers()

    return () => controller.abort();
  }, [])

  const loadMore = useCallback(() => {
    const controller = new AbortController();
    const fetchMore = async () => {
      setLoadingMore(true)
      try {
        const { data, total: fetchedTotal } = await getAllUsers({ limit: PAGE_SIZE, offset }, controller.signal);
        setUsers(prev => [...prev, ...data]);
        setTotal(fetchedTotal);
        setOffset(prev => prev + data.length);
      } catch (err) {
        notify(err.cause?.status === 403 ? 'You no longer have permission to view users.' : err.message, 'error')
      } finally {
        setLoadingMore(false);
      }
    }

    fetchMore()

    return () => controller.abort();
  }, [offset])

  if (loading) return <Loader />

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>
                {user.email}
              </td>
              <td>
                <button
                  disabled={userId === user.id}
                  onClick={() => handleClick(user.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {offset < total && (
        <button type="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Load more (${total - offset} remaining)`}
        </button>
      )}
    </>
  );
}
```

- [ ] **Step 8: `login-ui` — `LogsTable` reads `.data`, adds "Load more"**

Replace `/Users/vitbenton/Desktop/Repos/login-ui/src/components/Tables/LogsTable.jsx` in full with:

```jsx
import { useCallback, useEffect, useState } from "react"
import Loader from '../Loader'
import { useNotification } from '../../contexts/NotificationContext'
import { getAllLogs } from '../../api'

const PAGE_SIZE = 50

export default function LogsTable() {
  const { notify } = useNotification()

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLogs = async () => {
      try {
        const { data, total: fetchedTotal } = await getAllLogs({ limit: PAGE_SIZE, offset: 0 }, controller.signal);
        setLogs(data);
        setTotal(fetchedTotal);
        setOffset(data.length);
      } catch (err) {
        notify(err.cause?.status === 403 ? 'You no longer have permission to view logs.' : err.message, 'error')
      } finally {
        setLoading(false);
      }
    }

    fetchLogs()

    return () => controller.abort();
  }, [])

  const loadMore = useCallback(() => {
    const controller = new AbortController();
    const fetchMore = async () => {
      setLoadingMore(true)
      try {
        const { data, total: fetchedTotal } = await getAllLogs({ limit: PAGE_SIZE, offset }, controller.signal);
        setLogs(prev => [...prev, ...data]);
        setTotal(fetchedTotal);
        setOffset(prev => prev + data.length);
      } catch (err) {
        notify(err.cause?.status === 403 ? 'You no longer have permission to view logs.' : err.message, 'error')
      } finally {
        setLoadingMore(false);
      }
    }

    fetchMore()

    return () => controller.abort();
  }, [offset])

  if (loading) return <Loader />
  if (!logs.length) return <p>No logs found.</p>

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Success</th>
            <th>Message</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>
                {log.email}
              </td>
              <td>
                {log.success ? '✅' : '❌'}
              </td>
              <td>
                {log.message}
              </td>
              <td>
                {log.timestamp}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {offset < total && (
        <button type="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Load more (${total - offset} remaining)`}
        </button>
      )}
    </>
  );
}
```

- [ ] **Step 9: `login-ui` — verify**

```bash
cd /Users/vitbenton/Desktop/Repos/login-ui
npm run lint
npm run build
```

Expected: both succeed. `npm run lint` should still report only the same 1 pre-existing, out-of-scope error (`UserNav.jsx:8`) — no new ones.

Then manually, as an admin with 50+ seeded users (or lower `PAGE_SIZE` temporarily to test with fewer): confirm the table loads the first page, "Load more" appears with an accurate remaining count, clicking it appends rows and eventually disappears once everything is loaded. Repeat for logs.

- [ ] **Step 10: `login-ui` — commit**

```bash
cd /Users/vitbenton/Desktop/Repos/login-ui
git add src/api.js src/components/Tables/UsersTable.jsx src/components/Tables/LogsTable.jsx
git commit -m "Paginate Users/Logs tables instead of silently truncating at 50 (Tier 2)

GET /users and GET /logs now respond with { data, total, limit, offset }
(see simple-auth commit). getAllUsers/getAllLogs take an optional
{ limit, offset } and return the whole envelope; both tables fetch 50
rows at a time and show a 'Load more (N remaining)' button while
offset < total, instead of an admin silently seeing an incomplete list
past the old hard limit.

Item 10 of the Tier 2 audit."
```

---

## Task 4: Multi-tab/multi-device refresh coordination (item 13)

**Files:**
- Modify (`login-ui`): `src/api.js`, `src/contexts/SessionContext.jsx`

**Interfaces:**
- Consumes: Task 2's `fetchSession` (boolean-returning, `hasRetriedRef` guard) and Task 1's `user`/reducer shape.

- [ ] **Step 1: `login-ui` — single-flight + drop the unused header on `getRefreshToken`**

In `/Users/vitbenton/Desktop/Repos/login-ui/src/api.js`, replace the existing `getRefreshToken` function with:

```js
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
```

- [ ] **Step 2: `login-ui` — cross-tab coordination in `SessionContext`**

Replace `/Users/vitbenton/Desktop/Repos/login-ui/src/contexts/SessionContext.jsx` in full with:

```jsx
import { createContext, useReducer, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { getRefreshToken, getSessionUserInfo, updateUserEmailbyId, userLogin, userLogout } from '../api'
import { useNotification } from './NotificationContext'

const SessionContext = createContext()

function userReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {
        email: action.payload.email,
        created: action.payload.created,
        isAdmin: action.payload.isAdmin
      };
    case 'CLEAR_USER':
      return { email: '', created: '', isAdmin: false };
    default:
      return state;
  }
}

const initialUserState = {
  email: '',
  created: '',
  isAdmin: false
}

export function SessionProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [user, userDispatch] = useReducer(userReducer, initialUserState)
  const { notify } = useNotification()
  const hasRetriedRef = useRef(false)
  // Tracks whether *this tab* has ever confirmed a session, so a failed
  // refresh on first page load (no cookie yet — completely normal) can be
  // told apart from a refresh failing after the user was already in.
  const wasLoggedInRef = useRef(false)
  const channelRef = useRef(null)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel('session')
    channelRef.current = channel

    channel.onmessage = event => {
      if (event.data?.type === 'token-refreshed') {
        localStorage.setItem('accessToken', event.data.accessToken)
      } else if (event.data?.type === 'session-ended') {
        setIsLoggedIn(false)
        userDispatch({ type: 'CLEAR_USER' })
      }
    }

    return () => channel.close()
  }, [])

  const fetchSession = useCallback(async () => {
    try {
      const { id, email, created, isAdmin } = await getSessionUserInfo()
      setUserId(id)
      userDispatch({ type: 'SET_USER', payload: { email, created, isAdmin } })
      setIsLoggedIn(true)
      wasLoggedInRef.current = true
      hasRetriedRef.current = false
      return true
    } catch (error) {
      if (error.cause?.status === 401 && !hasRetriedRef.current) {
        hasRetriedRef.current = true

        try {
          const { accessToken } = await getRefreshToken();
          localStorage.setItem('accessToken', accessToken);
          // Other tabs can reuse this token instead of racing their own
          // refresh against the same (now-rotated) cookie.
          channelRef.current?.postMessage({ type: 'token-refreshed', accessToken })
          return await fetchSession()
        } catch (refreshError) {
          hasRetriedRef.current = false

          if (refreshError.cause?.status === 429) {
            notify('Too many attempts. Please wait a moment and try again.', 'error')
          } else if (wasLoggedInRef.current) {
            // Distinct from the silent first-visit case below: this tab
            // was genuinely logged in and the refresh got rejected —
            // most likely another tab/device refreshed first and rotated
            // the token this one was holding.
            notify('Your session ended (perhaps you signed in elsewhere). Please log in again.', 'error')
            channelRef.current?.postMessage({ type: 'session-ended' })
          }

          wasLoggedInRef.current = false
          setIsLoggedIn(false)
          return false
        }
      }

      hasRetriedRef.current = false

      if (error.cause?.status !== 401) {
        notify(error.message, 'error')
      }

      setIsLoggedIn(false)
      return false
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchSession().catch(error => notify(error.message, 'error'))
  }, [])

  const login = async (email, password) => {
    try {
      setLoading(true)
      await userLogin(email, password)
      const succeeded = await fetchSession()

      if (!succeeded) {
        throw new Error('Logged in, but failed to load your session. Please try again.')
      }
    } catch (error) {
      console.error(error)
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateEmail = useCallback(async (id, email) => {
    try {
      setLoading(true)
      await updateUserEmailbyId(id, email)
    } catch (error) {
      console.log(error);
      throw new Error(error.cause || error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await userLogout()
      localStorage.removeItem('accessToken')
      userDispatch({ type: 'CLEAR_USER' })
      setIsLoggedIn(false)
      wasLoggedInRef.current = false
    } catch (error) {
      throw new Error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <SessionContext.Provider value={{ isLoggedIn, logout, loading, login, userId, updateEmail, user }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
```

- [ ] **Step 3: `login-ui` — verify**

```bash
cd /Users/vitbenton/Desktop/Repos/login-ui
npm run lint
npm run build
```

Expected: both succeed. `npm run lint` should still report only the same 1 pre-existing, out-of-scope error (`UserNav.jsx:8`) — no new ones.

Then manually with two browser tabs on the same origin: log in in tab A, open tab B (same session). Force a refresh in tab A (clear its `accessToken` from `localStorage` and trigger any authenticated call, or just wait past access-token expiry) — confirm tab B's `localStorage` `accessToken` updates via the `BroadcastChannel` message without tab B itself hitting `/auth/refresh`. Then, to see the "signed out elsewhere" message: log in in one tab only, then in devtools directly call `POST /auth/refresh` with that tab's cookie from a separate tool (or log out from a different device) to rotate/revoke the token underneath the open tab, then trigger a `fetchSession()` in it (reload) — confirm the distinct toast appears instead of a silent bounce.

- [ ] **Step 4: `login-ui` — commit**

```bash
cd /Users/vitbenton/Desktop/Repos/login-ui
git add src/api.js src/contexts/SessionContext.jsx
git commit -m "Coordinate refresh across tabs instead of racing to invalidate each other (Tier 2)

token_version rotates per-user (not per-session), so two open tabs — or
a laptop and a phone — refreshing independently would silently and
permanently kick each other out, with no explanation. getRefreshToken
now single-flights concurrent callers within a tab (also dropping its
unused Authorization header, since /auth/refresh is cookie-only), and
SessionContext broadcasts a successful refresh's access token to sibling
tabs over a BroadcastChannel so they adopt it instead of racing their
own refresh against an already-rotated cookie. When a refresh does fail
for a tab that was genuinely already logged in (most likely rotated out
by another tab/device), that tab now shows a distinct honest message
instead of bouncing silently to the login screen.

Item 13 of the Tier 2 audit."
```

---

## After this plan

Update the audit doc's status table (`/private/tmp/claude-501/-Users-vitbenton-Desktop-Repos-login-ui/88ab72fe-f92b-4c55-b914-10fe95217643/scratchpad/login-ui-auth-audit.md`) to mark Tier 2 done, alongside the commit hashes from Tasks 1–4. Tier 3 (polish) remains — see that doc's Tier 3 section; the `getSessionUserInfo`/`getRefreshToken` and `RegisterForm`/`LoginForm` `type`/`autoComplete` items are the only Tier 3 items *not* already folded into this plan (`getSessionUserInfo`'s fix landed in Task 2; `getRefreshToken`'s Authorization-header cleanup landed in Task 4).
