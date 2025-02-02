import { writable } from "svelte/store";

export const killSwitch = writable<boolean>(false);