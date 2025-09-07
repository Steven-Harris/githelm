import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: 'index.html', // Enable SPA mode for client-side routing
      precompress: false,
      strict: true,
    }),
    prerender: {
      handleUnseenRoutes: 'ignore', // Ignore dynamic routes that can't be prerendered
      handleHttpError: ({ path, referrer, message }) => {
        // ignore deliberate link to shiny 404 page
        if (path === '/pr/[owner]/[repo]/[number]') {
          return;
        }
        // otherwise fail the build
        throw new Error(message);
      }
    },
    serviceWorker: {
      register: false,
    },
    alias: {
      '$assets/*': './src/assets/*',
      '$integrations/firebase': './src/integrations/firebase/index',
      '$integrations/github': './src/integrations/github/index',
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
