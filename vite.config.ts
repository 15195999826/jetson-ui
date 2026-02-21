import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',  // file:// 协议必须
  plugins: [react()],
  server: {
    proxy: {
      '/ws': {
        target: 'ws://192.168.1.29:8080',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: 'http://192.168.1.29:5001',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: { manualChunks: undefined }
    },
    cssCodeSplit: false,
  }
})
