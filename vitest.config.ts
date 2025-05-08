import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';
import { resolve } from 'path';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.{test,spec}.{js,ts,svelte}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['**/*.d.ts', '**/node_modules/**', 'src/app.html', 'src/assets/**'],
      },
      deps: {
        optimizer: {
          web: {
            include: ['firebase'],
          },
        },
      },
    },
    resolve: {
      alias: {
        $lib: resolve('./src/lib'),
        $assets: resolve('./src/assets'),
        $integrations: resolve('./src/integrations'),
      },
    },
  })
);
