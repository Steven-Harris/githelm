import { getStorageObject, setStorageObject } from "$lib/integrations";
import { readable } from "svelte/store";
import { manualTrigger } from "./last-updated";

const STALE_INTERVAL = 60 * 1000; // 60 seconds
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
  const now = Date.now();
  if (!storage.data || storage.lastUpdated <= (now - STALE_INTERVAL)) {
    await fetchData(key, fetchDataCallback, set);
  } else {
    set(storage.data);
  }
}

function startPolling<T>(key: string, fetchDataCallback: () => Promise<T>, set: (value: T) => void) {
  let interval = setInterval(() => checkAndFetchData(key, fetchDataCallback, set), STALE_INTERVAL);

  const unsubscribeManualTrigger = manualTrigger.subscribe(() => {
    console.log("manualTrigger");
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

  return readable<T>(initialData, set => {
    const unsubscribe = startPolling(key, fetchDataCallback, set);
    checkAndFetchData(key, fetchDataCallback, set);
    return unsubscribe;
  });
}

export default createPollingStore;