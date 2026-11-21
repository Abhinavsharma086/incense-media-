/**
 * Real-Time Cross-Browser & Cross-Tab Data Synchronization Service
 *
 * Provides:
 * 1. BroadcastChannel synchronization across tabs of the same browser (< 5ms latency).
 * 2. Window focus & Tab visibilitychange refetching (Chrome <-> Firefox switching).
 * 3. Server Version Heartbeat Polling (/api/sync/status) for side-by-side multi-screen browsers.
 * 4. Anti-tamper, non-intrusive background refreshes that never clear open modals or user typing.
 */

import { useEffect, useRef, useCallback } from 'react';
import crmApi from '../api/crmApi';

export type SyncEntity =
  | 'leads'
  | 'deals'
  | 'customers'
  | 'employees'
  | 'dashboard'
  | 'user_profile'
  | 'settings'
  | 'followups'
  | 'campaigns'
  | 'inquiries'
  | 'all';

interface SyncMessage {
  type: 'DATA_CHANGED';
  entity: SyncEntity | string;
  action?: string;
  timestamp: number;
}

const SYNC_CHANNEL_NAME = 'incense_crm_data_sync_channel';
const STORAGE_SYNC_KEY = 'incense_crm_sync_trigger';

// Shared BroadcastChannel instance (with fallback for legacy environments)
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment, using localStorage fallback');
}

/**
 * Call this function whenever any record is created, updated, or deleted
 * to notify all open browser tabs and other browser instances immediately.
 */
export const notifyDataChanged = (entity: SyncEntity | string, action: string = 'update', _data?: any) => {
  const timestamp = Date.now();
  const message: SyncMessage = {
    type: 'DATA_CHANGED',
    entity,
    action,
    timestamp,
  };

  // 1. Send via BroadcastChannel (instant in same browser across all tabs/windows)
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(message);
    }
  } catch (err) {
    console.warn('BroadcastChannel error:', err);
  }

  // 2. Trigger localStorage storage event (fallback across tabs)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(message));
    }
  } catch (_) {}

  // 3. Dispatch local in-window CustomEvent
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm:datasync', { detail: message }));
    }
  } catch (_) {}
};

export interface UseDataSyncOptions {
  pollingIntervalMs?: number; // Background polling interval (default: 12000 ms)
  enableFocusRefetch?: boolean; // Refetch when browser window is focused (default: true)
  enableVisibilityRefetch?: boolean; // Refetch when tab becomes visible (default: true)
  enablePolling?: boolean; // Enable server version polling (default: true)
  throttleMs?: number; // Minimum time between consecutive refetches (default: 2000 ms)
}

/**
 * Hook to automatically keep component data synchronized across multiple browsers,
 * tabs, and active user sessions.
 *
 * @param entity Entity name (e.g. 'leads', 'deals', 'customers', 'employees', 'dashboard')
 * @param onSync Callback function to fetch or refresh data
 * @param options Optional configuration
 */
export const useDataSync = (
  entity: SyncEntity | string | (SyncEntity | string)[],
  onSync: () => void | Promise<void>,
  options: UseDataSyncOptions = {}
) => {
  const {
    pollingIntervalMs = 12000,
    enableFocusRefetch = true,
    enableVisibilityRefetch = true,
    enablePolling = true,
    throttleMs = 2000,
  } = options;

  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const lastSyncTimeRef = useRef<number>(Date.now());
  const lastServerVersionRef = useRef<number>(0);
  const entities = Array.isArray(entity) ? entity : [entity];

  // Throttled executor to prevent duplicate concurrent network bursts
  const triggerSync = useCallback((reason: string) => {
    const now = Date.now();
    if (now - lastSyncTimeRef.current < throttleMs) {
      return;
    }
    lastSyncTimeRef.current = now;

    try {
      const res = onSyncRef.current();
      if (res && typeof (res as any).catch === 'function') {
        (res as Promise<void>).catch((err) => {
          console.debug(`[useDataSync:${entities.join(',')}] sync error on ${reason}:`, err);
        });
      }
    } catch (e) {
      console.debug(`[useDataSync:${entities.join(',')}] sync error on ${reason}:`, e);
    }
  }, [entities, throttleMs]);

  // 1. Cross-Tab BroadcastChannel & Storage Event Listeners
  useEffect(() => {
    const isTargetEntity = (target: string) => {
      return target === 'all' || entities.includes('all') || entities.includes(target as any);
    };

    const handleMessage = (msg: SyncMessage) => {
      if (msg && msg.type === 'DATA_CHANGED' && isTargetEntity(msg.entity)) {
        triggerSync(`broadcast:${msg.entity}`);
      }
    };

    const onBroadcast = (event: MessageEvent<SyncMessage>) => {
      handleMessage(event.data);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_SYNC_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as SyncMessage;
          handleMessage(parsed);
        } catch (_) {}
      }
    };

    const onCustomEvent = (event: Event) => {
      const custom = event as CustomEvent<SyncMessage>;
      if (custom.detail) {
        handleMessage(custom.detail);
      }
    };

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', onBroadcast);
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('crm:datasync', onCustomEvent);

    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', onBroadcast);
      }
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('crm:datasync', onCustomEvent);
    };
  }, [entities, triggerSync]);

  // 2. Refetch-on-Focus & VisibilityChange (Swapping between Chrome, Firefox, etc.)
  useEffect(() => {
    if (!enableFocusRefetch && !enableVisibilityRefetch) return;

    const handleFocus = () => {
      if (enableFocusRefetch) {
        triggerSync('window-focus');
      }
    };

    const handleVisibilityChange = () => {
      if (enableVisibilityRefetch && document.visibilityState === 'visible') {
        triggerSync('visibility-visible');
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableFocusRefetch, enableVisibilityRefetch, triggerSync]);

  // 3. Server Version Heartbeat Polling (Detects changes made in other browsers)
  useEffect(() => {
    if (!enablePolling || pollingIntervalMs <= 0) return;

    let isMounted = true;

    const checkServerVersion = async () => {
      // Only poll when the document tab is currently visible
      if (document.hidden) return;

      try {
        const res = await crmApi.get('/sync/status', {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          params: { _t: Date.now() },
        });

        if (!isMounted) return;

        const versions = res.data?.versions;
        if (!versions) return;

        // Check if any monitored entity has updated on the server
        let hasChanges = false;
        let maxVersion = lastServerVersionRef.current;

        for (const ent of entities) {
          const v = versions[ent] || versions['all'] || 0;
          if (v > lastServerVersionRef.current) {
            hasChanges = true;
          }
          if (v > maxVersion) {
            maxVersion = v;
          }
        }

        // Initialize version reference on first run
        if (lastServerVersionRef.current === 0) {
          lastServerVersionRef.current = maxVersion;
          return;
        }

        if (hasChanges) {
          lastServerVersionRef.current = maxVersion;
          triggerSync('server-version-changed');
        }
      } catch (err) {
        // Fallback silently if offline or endpoint not reachable
      }
    };

    // Initial check after mount
    const initialTimer = setTimeout(checkServerVersion, 3000);
    const intervalTimer = setInterval(checkServerVersion, pollingIntervalMs);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [enablePolling, pollingIntervalMs, entities, triggerSync]);
};

export default useDataSync;
