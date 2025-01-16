import { getStorageObject, setStorageObject } from "$lib/integrations";
import { readable } from "svelte/store";

const STALE_INTERVAL = 60 * 1000; // 60 seconds
const RETRY_INTERVAL = 10 * 1000; // 10 seconds

function createPollingStore<T>(key: string, fetchDataCallback: () => Promise<T>) {
  const storage = getStorageObject<T>(key);
  const initialData = storage.data || {} as T;

  const fetchData = async (set: (value: T) => void) => {
    try {
      const data = await fetchDataCallback();
      setStorageObject(key, data);
      set(data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setTimeout(() => fetchData(set), RETRY_INTERVAL);
    }
  };

  const checkAndFetchData = async (set: (value: T) => void) => {
    const storage = getStorageObject<T>(key);
    const now = Date.now();
    if (!storage.data || now - storage.lastUpdated > Date.now() - STALE_INTERVAL) {
      await fetchData(set);
    } else {
      set(storage.data);
    }
  };

  const startPolling = (set: (value: T) => void) => {
    const interval = setInterval(() => checkAndFetchData(set), STALE_INTERVAL);
    return () => clearInterval(interval);
  };

  return readable<T>(initialData, set => {
    const unsubscribe = startPolling(set);
    checkAndFetchData(set);
    return unsubscribe;
  });
}

export default createPollingStore;