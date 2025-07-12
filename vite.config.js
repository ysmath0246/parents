import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/parents/',        // ← GitHub Pages에 올라갈 경로
  build: {
    outDir: 'docs',         // ← 빌드 결과물을 docs/ 폴더에!
  },
  plugins: [react()],
})
