#!/usr/bin/env node

/**
 * This script automatically fixes common linting issues in the GitHelm codebase.
 * Run with: node fix-lint.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Files with unused variables that need to be prefixed with _
const filesToFix = [
  // Fix unused variables
  {
    path: 'src/integrations/github/auth.ts',
    changes: [
      {
        pattern: /tokenRefreshPromise/g,
        replacement: '_tokenRefreshPromise',
      },
      {
        pattern: /try {/g,
        replacement: 'try {',
      },
      {
        pattern: / catch \(e\) {/g,
        replacement: ' catch (_e) {',
      },
      {
        pattern: /token && tryRefresh\(\);/g,
        replacement: 'if (token) tryRefresh();',
      },
    ],
  },
  {
    path: 'src/integrations/sentry/client.ts',
    changes: [
      {
        pattern: /const error = /g,
        replacement: 'const _error = ',
      },
    ],
  },
  {
    path: 'src/lib/config/useDraggable.ts',
    changes: [
      {
        pattern: /removeClickDetectionListener\(event\)/g,
        replacement: 'removeClickDetectionListener(_event)',
      },
    ],
  },
  {
    path: 'src/integrations/storage.ts',
    changes: [
      {
        pattern: /while \(true\) {/g,
        replacement: '// eslint-disable-next-line no-constant-condition\n  while (true) {',
      },
    ],
  },
  {
    path: 'src/lib/ReloadPrompt.svelte',
    changes: [
      {
        pattern: /workbox && workbox/g,
        replacement: 'if (workbox) workbox',
      },
    ],
  },
  {
    path: 'src/lib/config/RepositorySearch.svelte',
    changes: [
      {
        pattern: /\(i, item\) =>/g,
        replacement: '(_i, item) =>',
      },
    ],
  },
];

// Process each file
for (const fileInfo of filesToFix) {
  try {
    const fullPath = resolve(process.cwd(), fileInfo.path);
    let content = readFileSync(fullPath, 'utf8');

    // Apply all replacements for this file
    for (const change of fileInfo.changes) {
      content = content.replace(change.pattern, change.replacement);
    }

    // Write the updated content back to the file
    writeFileSync(fullPath, content, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`✅ Fixed: ${fileInfo.path}`);
  } catch (err) {
    console.error(`❌ Error processing ${fileInfo.path}:`, err);
  }
}

// eslint-disable-next-line no-console
console.log('\nDone fixing lint issues! Run "pnpm lint:fix" to apply further automatic fixes.');
