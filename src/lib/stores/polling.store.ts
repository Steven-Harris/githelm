import { getStorageObject, setStorageObject } from "$lib/integrations/storage";
import { readable } from "svelte/store";
import { manualTrigger } from "./last-updated.store";

const STALE_INTERVAL = 60 * 1000 - 200; // 60 seconds - 200ms for random jitter
const RANDOM_RETRY_INTERVAL = () => Math.floor(Math.random() * 10) * 1000; // random wait between 1 and 10 seconds

async function fetchData<T>(key: string, fetchDataCallback: () => Promise<T>, set: (value: T) => void) {
  try {
    const data = await fetchDataCallback();
    setStorageObject(key, data);
    set(data);
  } catch (error) {
    setTimeout(() => fetchData(key, fetchDataCallback, set), RANDOM_RETRY_INTERVAL());
  }
}

async function checkAndFetchData<T>(key: string, fetchDataCallback: () => Promise<T>, set: (value: T) => void) {
  const storage = getStorageObject<T>(key);
  // now - 400ms to account for any time it took to get the data
  const now = Date.now();
  if (!storage.data || storage.lastUpdated + STALE_INTERVAL <= now) {
    await fetchData(key, fetchDataCallback, set);
  } else {
    set(storage.data);
  }
}

function startPolling<T>(key: string, fetchDataCallback: () => Promise<T>, set: (value: T) => void) {
  checkAndFetchData(key, fetchDataCallback, set);
  let interval = setInterval(() => checkAndFetchData(key, fetchDataCallback, set), STALE_INTERVAL);

  const unsubscribeManualTrigger = manualTrigger.subscribe(trigger => {
    if (!trigger) {
      return;
    }
    clearInterval(interval);
    fetchData(key, fetchDataCallback, set);
    manualTrigger.set(false);
    interval = setInterval(() => checkAndFetchData(key, fetchDataCallback, set), STALE_INTERVAL);
  });

  return () => {
    clearInterval(interval);
    unsubscribeManualTrigger();
  };
}

function createPollingStore<T>(key: string, fetchDataCallback: () => Promise<T>) {
  const storage = getStorageObject<T>(key);
  const initialData = storage.data || {} as T;
  return readable<T>(initialData, set => startPolling(key, fetchDataCallback, set));
}

export default createPollingStore;