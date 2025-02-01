import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: undefined,
      precompress: true,
      strict: true
    }),
    serviceWorker: {
      register: false
    },
    alias: {
      '$assets/*': './src/assets/*',
      '$integrations/*': './src/integrations/*',
      '$stores/*': './src/lib/stores/*',
    },
  },
};

export default config;