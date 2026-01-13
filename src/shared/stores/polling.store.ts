import { getStorageObject, setStorageObject } from '$shared/services/storage.service';
import { readable } from 'svelte/store';
import { killSwitch } from './kill-switch.store';
import { manualTrigger } from './last-updated.store';
import { captureException } from '$integrations/sentry';
import { pollingPaused } from './polling-paused.store';

type ValueSetter<T> = (value: T) => void;
type AsyncCallback<T> = () => Promise<T>;

const STALE_INTERVAL = 60 * 1000; // 60 seconds
const RANDOM_RETRY_INTERVAL = () => Math.floor(Math.random() * 10) * 1000; // random wait between 1 and 10 seconds
let kill = false;
let paused = false;
const ongoingRequests = new Set<string>();

function createPollingStore<T>(key: string, callback: AsyncCallback<T>) {
  const storage = getStorageObject<T>(key);
  const initialData = storage.data || ({} as T);
  return readable<T>(initialData, (set) => startPolling(key, callback, set));
}

function startPolling<T>(key: string, callback: AsyncCallback<T>, set: ValueSetter<T>) {
  let interval: NodeJS.Timeout;

  const startInterval = () => {
    if (kill || paused) {
      return;
    }
    interval = setInterval(() => checkAndFetchData(key, callback, set), STALE_INTERVAL);
  };

  const stopInterval = () => {
    clearInterval(interval);
  };

  const unsubscribeManualTrigger = manualTrigger.subscribe((trigger) => {
    if (!trigger) {
      return;
    }
    if (paused) {
      manualTrigger.set(false);
      return;
    }
    stopInterval();
    fetchData(key, callback, set);
    manualTrigger.set(false);
    startInterval();
  });

  const unsubscribeKillSwitch = killSwitch.subscribe((active) => {
    kill = active;
    if (active) {
      stopInterval();
    } else {
      startInterval();
    }
  });

  const unsubscribePollingPaused = pollingPaused.subscribe((isPaused) => {
    paused = isPaused;
    if (isPaused) {
      stopInterval();
      return;
    }

    // On resume, run a single check immediately so the dashboard catches up.
    checkAndFetchData(key, callback, set);
    startInterval();
  });

  // Only kick off polling immediately if we're not paused.
  if (!paused) {
    checkAndFetchData(key, callback, set);
    startInterval();
  }

  return () => {
    stopInterval();
    unsubscribeManualTrigger();
    unsubscribeKillSwitch();
    unsubscribePollingPaused();
  };
}

async function checkAndFetchData<T>(key: string, callback: AsyncCallback<T>, set: ValueSetter<T>) {
  if (kill || paused) {
    return;
  }
  const storage = getStorageObject<T>(key);
  const now = Date.now();
  
  // Check if we have valid cached data
  if (storage.data && storage.lastUpdated && storage.lastUpdated + STALE_INTERVAL - 3000 > now) {
    set(storage.data);
    return;
  }

  await fetchData(key, callback, set);
}

async function fetchData<T>(key: string, callback: AsyncCallback<T>, set: ValueSetter<T>) {
  if (kill || paused || ongoingRequests.has(key)) {
    return;
  }
  ongoingRequests.add(key);
  try {
    const data = await callback();
    
    // Always update the store with fresh data, even if it hasn't changed
    // This ensures UI reactivity is maintained
    setStorageObject(key, data);
    set(data);
    
  } catch (error) {
    console.warn(`Error fetching data for key: ${key}:`, error);
    
    captureException(error instanceof Error ? error : new Error(`Error fetching data for key: ${key}`), {
      contexts: key,
      action: 'fetchData',
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Try to use cached data on error
    const storage = getStorageObject<T>(key);
    if (storage.data) {
      set(storage.data);
    }
    
    // Retry with exponential backoff
    setTimeout(() => fetchData(key, callback, set), RANDOM_RETRY_INTERVAL());
  } finally {
    ongoingRequests.delete(key);
  }
}

export default createPollingStore;
