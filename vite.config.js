import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveSiteUrl } from './scripts/site-url.mjs'

export default defineConfig(({ mode }) => {
  // Canonical origin for SEO tags in the client bundle (see scripts/site-url.mjs).
  process.env.VITE_SITE_URL = resolveSiteUrl({ ...loadEnv(mode, process.cwd(), ''), ...process.env })

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (id.includes('gsap')) return 'gsap'
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('react-router')) return 'router'
            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
          },
        },
      },
    },
    server: {
      host: true,
    },
  }
})
