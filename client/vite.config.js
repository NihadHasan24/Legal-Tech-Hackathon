import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/health': process.env.VITE_API_TARGET || 'http://127.0.0.1:5000',
      '/api': process.env.VITE_API_TARGET || 'http://127.0.0.1:5000',
    },
  },
})
