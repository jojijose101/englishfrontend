import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_URL || 'https://englishapi-three.vercel.app'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('error', (err) => console.log('[proxy error]', err.message))
            proxy.on('proxyReq', (_, req) => console.log('[proxy]', req.method, req.url, '->', backendUrl))
          },
        },
      },
    },
  }
})