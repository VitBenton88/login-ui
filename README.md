# Login UI

This template provides a minimal setup for functioning frontend for my [simple-auth](https://github.com/VitBenton88/simple-auth) backend.

## Configuration

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the simple-auth API (no trailing slash), e.g. `https://api.example.com`. Leave unset for local dev or when this app is served from the same origin as simple-auth. | *(none — relative paths)* |

See [.env.example](.env.example).

## Deploying alongside simple-auth

simple-auth's refresh-token cookie is `httpOnly` and `SameSite=Strict`. That means **this app and simple-auth must be deployed on the same parent domain** — e.g. `app.example.com` (this app) and `api.example.com` (simple-auth) — for silent session refresh and logout to work at all. `SameSite=Strict` blocks the cookie from ever being sent between genuinely unrelated domains (different registrable domains), regardless of CORS or `VITE_API_URL` configuration; there is no client-side fix for that if the two are hosted on unrelated domains.

Once the domains line up, also set simple-auth's `CORS_ORIGIN` env var to this app's deployed origin (see [simple-auth's README](https://github.com/VitBenton88/simple-auth#environment-variables)) — the API rejects cross-origin credentialed requests from anywhere else.