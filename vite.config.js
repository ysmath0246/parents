import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/parents/',     // ← 이 줄을 추가!
  plugins: [react()],
})
