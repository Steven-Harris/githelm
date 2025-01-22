import { getLastUpdated } from "$lib/integrations";
import { readable, writable } from "svelte/store";

export const manualTrigger = writable(false);

function lastUpdated(): number {
  const lastUpdated: number = getLastUpdated();
  if (!lastUpdated) {
    return 0;
  }
  return Math.floor((Date.now() - lastUpdated) / 1000);
}

function watchTimeElapsed(set: (value: number) => void): any {
  return setInterval(() => set(lastUpdated()), 1000);
}

function resetTimer(timer: any, set: (value: number) => void) {
  if (timer) {
    clearInterval(timer);
  }
  set(0);
}

export function lastUpdatedStore() {
  return readable<number>(0, set => {
    let timer = watchTimeElapsed(set);

    return () => {
      resetTimer(timer, set);
    };
  });
}