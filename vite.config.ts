import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  base: '/solid-electric-app/'
  plugins: [solid()],
  assetsInclude: [`**/*.wasm`],

})
