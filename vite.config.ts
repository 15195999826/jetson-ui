import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/ws': {
        target: 'ws://192.168.1.29:8080',
        ws: true,
        changeOrigin: true,
      },
      '/sessions': {
        target: 'http://192.168.1.29:8080',
        changeOrigin: true,
      },
      '/minimize': {
        target: 'http://192.168.1.29:8080',
        changeOrigin: true,
      },
    }
  },
  build: {
    rollupOptions: {
      output: { manualChunks: undefined }
    },
    cssCodeSplit: false,
  }
})
