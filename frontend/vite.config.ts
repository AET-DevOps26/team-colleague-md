import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/user': {
        target: 'http://localhost:8081',
        rewrite: (path) => path.replace(/^\/api\/user/, ''),
      },
      '/api/content': {
        target: 'http://localhost:8082',
        rewrite: (path) => path.replace(/^\/api\/content/, ''),
      },
    },
  },
})
