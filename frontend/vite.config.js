import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from "@tailwindcss/vite";

// Keep Tailwind source discovery synchronized after component refactors.
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
