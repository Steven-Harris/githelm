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
      precompress: false,
      strict: true,
    }),
    serviceWorker: {
      register: false,
    },
    alias: {
      '$assets/*': './src/assets/*',
      '$integrations/firebase': './src/integrations/firebase/index',
      '$integrations/firebase/*': './src/integrations/firebase/index/*',
      '$integrations/github': './src/integrations/github/index',
      '$integrations/github/*': './src/integrations/github/index/*',
      '$integrations/*': './src/integrations/*',
      '$shared': './src/shared',
      '$shared/*': './src/shared/*',
      '$features': './src/features',
      '$features/*': './src/features/*',
      '$stores/*': './src/shared/stores/*',
    },
  },
};

export default config;
