import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiPort = process.env.PORT ?? '3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/board': `http://localhost:${apiPort}`,
      '/tasks': `http://localhost:${apiPort}`,
    },
  },
})
