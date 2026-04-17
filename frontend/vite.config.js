import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180, // Changed to 5180 to escape the memory of the previous project
    strictPort: true,
    open: true // This will open the browser automatically when you run
  }
})