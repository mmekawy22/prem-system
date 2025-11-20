import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // ==> Add this line <==
  base: './',
server: {
    host: '0.0.0.0', // هنا المهم
    port: 3000
  }
})