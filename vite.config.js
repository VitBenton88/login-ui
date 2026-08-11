import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Same variable the built app reads (src/api.js) as its API base URL, so
  // pointing dev at a non-default simple-auth instance is one env var, not
  // two settings that can drift out of sync.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '^/(logs|auth|users)': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    }
  }
})
