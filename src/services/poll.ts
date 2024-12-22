import { readable } from "svelte/store";
import { getStorageObject, setStorageObject } from "../services/storage";

const POLL_INTERVAL = 60000; // 60 seconds
const RETRY_INTERVAL = 10000; // 10 seconds
const STALE_THRESHOLD = 60000; // 1 minute

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
    if (!storage.data || now - storage.lastUpdated > STALE_THRESHOLD) {
      await fetchData(set);
    } else {
      set(storage.data);
    }
  };

  const startPolling = (set: (value: T) => void) => {
    const interval = setInterval(() => checkAndFetchData(set), POLL_INTERVAL);
    return () => clearInterval(interval);
  };

  return readable<T>(initialData, set => {
    const unsubscribe = startPolling(set);
    checkAndFetchData(set);
    return unsubscribe;
  });
}

export default createPollingStore;