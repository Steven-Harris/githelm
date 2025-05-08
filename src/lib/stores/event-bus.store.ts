import { writable, type Writable } from 'svelte/store';

export const eventBus: Writable<string> = writable('');
