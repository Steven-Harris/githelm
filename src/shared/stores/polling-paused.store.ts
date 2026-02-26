import { writable } from 'svelte/store';

// When true, all polling stores stop their timers and skip fetches.
// Intended for routes like PR review where background refresh is undesirable.
export const pollingPaused = writable(false);
