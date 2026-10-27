import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The backend has no CORS middleware; proxying keeps the browser same-origin.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
