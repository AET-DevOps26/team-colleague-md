import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/user': {
        target: 'http://localhost:8081',
        rewrite: (path) => path.replace(/^\/user/, ''),
      },
      '/content': {
        target: 'http://localhost:8082',
        rewrite: (path) => path.replace(/^\/content/, ''),
      },
      '/recommendation': {
        target: 'http://localhost:8083',
        rewrite: (path) => path.replace(/^\/recommendation/, ''),
      },
      '/genai': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/genai/, ''),
      },
    },
  },
})
