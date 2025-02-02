import { getStorageObject, setStorageObject } from "$integrations/storage";
import { readable } from "svelte/store";
import { manualTrigger } from "./last-updated.store";

type ValueSetter<T> = (value: T) => void;
type AsyncCallback<T> = () => Promise<T>;

const STALE_INTERVAL = 60 * 1000; // 60 seconds
const RANDOM_RETRY_INTERVAL = () => Math.floor(Math.random() * 10) * 1000; // random wait between 1 and 10 seconds

async function fetchData<T>(key: string, callback: AsyncCallback<T>, set: ValueSetter<T>) {
  try {
    const data = await callback();
    setStorageObject(key, data);
    set(data);
  } catch {
    setTimeout(() => fetchData(key, callback, set), RANDOM_RETRY_INTERVAL());
  }
}

async function checkAndFetchData<T>(key: string, callback: AsyncCallback<T>, set: ValueSetter<T>) {
  const storage = getStorageObject<T>(key);
  if (storage.data && storage.lastUpdated + STALE_INTERVAL - 3000 > Date.now()) {
    set(storage.data);
    return
  }

  await fetchData(key, callback, set);
}

function startPolling<T>(key: string, callback: AsyncCallback<T>, set: ValueSetter<T>) {
  checkAndFetchData(key, callback, set);
  let interval = setInterval(() => checkAndFetchData(key, callback, set), STALE_INTERVAL);

  const unsubscribeManualTrigger = manualTrigger.subscribe(trigger => {
    if (!trigger) {
      return;
    }
    clearInterval(interval);
    fetchData(key, callback, set);
    manualTrigger.set(false);
    interval = setInterval(() => checkAndFetchData(key, callback, set), STALE_INTERVAL);
  });

  return () => {
    clearInterval(interval);
    unsubscribeManualTrigger();
  };
}

function createPollingStore<T>(key: string, callback: AsyncCallback<T>) {
  const storage = getStorageObject<T>(key);
  const initialData = storage.data || {} as T;
  return readable<T>(initialData, set => startPolling(key, callback, set));
}

export default createPollingStore;