import { memoryCacheService } from '$shared/services/memory-cache.service';
import { readable } from 'svelte/store';
import { killSwitch } from './kill-switch.store';
import { manualTrigger } from './last-updated.store';
import { captureException } from '$integrations/sentry';

type ValueSetter<T> = (value: T) => void;
type AsyncCallback<T> = () => Promise<T>;

const STALE_INTERVAL = 60 * 1000; // 60 seconds
const RANDOM_RETRY_INTERVAL = () => Math.floor(Math.random() * 10) * 1000; // random wait between 1 and 10 seconds
let kill = false;
const ongoingRequests = new Set<string>();

function createPollingStore<T>(key: string, callback: AsyncCallback<T>) {
  const cachedData = memoryCacheService.get<T>(key);
  const initialData = cachedData || ({} as T);
  return readable<T>(initialData, (set) => startPolling(key, callback, set));
}

function startPolling<T>(key: string, callback: AsyncCallback<T>, set: ValueSetter<T>) {
  let interval: NodeJS.Timeout;

  const startInterval = () => {
    interval = setInterval(() => checkAndFetchData(key, callback, set), STALE_INTERVAL);
  };

  const stopInterval = () => {
    clearInterval(interval);
  };

  const unsubscribeManualTrigger = manualTrigger.subscribe((trigger) => {
    if (!trigger) {
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

  checkAndFetchData(key, callback, set);
  startInterval();

  return () => {
    stopInterval();
    unsubscribeManualTrigger();
    unsubscribeKillSwitch();
  };
}

async function checkAndFetchData<T>(key: string, callback: AsyncCallback<T>, set: ValueSetter<T>) {
  const cachedData = memoryCacheService.get<T>(key);
  
  // Check if we have valid cached data (memory cache automatically handles expiration)
  if (cachedData) {
    set(cachedData);
    return;
  }

  await fetchData(key, callback, set);
}

async function fetchData<T>(key: string, callback: AsyncCallback<T>, set: ValueSetter<T>) {
  if (kill || ongoingRequests.has(key)) {
    return;
  }
  ongoingRequests.add(key);
  try {
    const data = await callback();
    
    // Always update the store with fresh data, even if it hasn't changed
    // This ensures UI reactivity is maintained
    memoryCacheService.set(key, data, STALE_INTERVAL);
    set(data);
    
  } catch (error) {
    console.warn(`Error fetching data for key: ${key}:`, error);
    
    captureException(error instanceof Error ? error : new Error(`Error fetching data for key: ${key}`), {
      contexts: key,
      action: 'fetchData',
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Try to use cached data on error
    const cachedData = memoryCacheService.get<T>(key);
    if (cachedData) {
      set(cachedData);
    }
    
    // Retry with exponential backoff
    setTimeout(() => fetchData(key, callback, set), RANDOM_RETRY_INTERVAL());
  } finally {
    ongoingRequests.delete(key);
  }
}

export default createPollingStore;
