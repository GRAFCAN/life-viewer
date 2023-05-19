import { VitePluginRadar } from 'vite-plugin-radar'

export default {
  build: {
    sourcemap: true,
  },
  plugins: [
    VitePluginRadar({
      // Google Analytics tag injection
      enableDev: true,
      analytics: {
        id: 'G-VVQPW150PB',
      },
    })
  ],
}
