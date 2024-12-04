import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{svelte,ts,js,html}'],
  theme: {
    extend: {}
  },
  plugins: [containerQueries, forms, typography],
} satisfies Config;