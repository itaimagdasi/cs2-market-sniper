import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180, // שינינו ל-5180 כדי לברוח מהזיכרון של הפרויקט הקודם
    strictPort: true,
    open: true // זה יפתח את הדפדפן אוטומטית כשתריץ
  }
})