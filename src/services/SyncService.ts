import NetInfo from '@react-native-community/netinfo';
import {
  getPendingLogs,
  markAsSynced,
  deleteSyncedLogs,
  getPendingCount,
} from './DatabaseService';

// ── AWS endpoint — replace with real URL before submission ─
// For demo: use a free mock API at mockapi.io or run locally
const AWS_ENDPOINT = 'https://jsonplaceholder.typicode.com/posts';
// ^^^ This is a free test API that accepts POST and returns 201
// Replace with your actual AWS API Gateway URL for production

let isSyncing = false;
let lastSyncTime: number | null = null;
let syncListeners: ((result: SyncResult) => void)[] = [];

export interface SyncResult {
  success: boolean;
  synced: number;
  purged: number;
  message: string;
  timestamp: number;
}

// ── Add listener — SyncDashboard calls this to get updates ─
export const addSyncListener = (
  fn: (result: SyncResult) => void
): (() => void) => {
  syncListeners.push(fn);
  return () => {
    syncListeners = syncListeners.filter(l => l !== fn);
  };
};

const notifyListeners = (result: SyncResult) => {
  syncListeners.forEach(fn => fn(result));
};

// ── Core sync function ─────────────────────────────────────
export const syncAttendanceLogs = async (): Promise<SyncResult> => {
  // Prevent concurrent sync calls
  if (isSyncing) {
    return {
      success: false,
      synced: 0,
      purged: 0,
      message: 'Sync already in progress',
      timestamp: Date.now(),
    };
  }

  isSyncing = true;
  console.log('🔄 Starting sync...');

  try {
    const pendingLogs = getPendingLogs();

    if (pendingLogs.length === 0) {
      isSyncing = false;
      return {
        success: true,
        synced: 0,
        purged: 0,
        message: 'No pending records',
        timestamp: Date.now(),
      };
    }

    console.log(`📤 Uploading ${pendingLogs.length} records to AWS...`);

    // POST all pending records to AWS in one batch
    const response = await fetch(AWS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'NeuralGate',
        device_id: 'DEVICE_001',
        records: pendingLogs.map(log => ({
          id: log.id,
          employee_id: log.employee_id,
          employee_name: log.employee_name,
          timestamp: log.timestamp,
          formatted_time: log.formatted_time,
        })),
      }),
    });

    // Accept both 200 and 201 as success
    if (response.ok || response.status === 201) {
      const syncedIds = pendingLogs.map(log => log.id);

      // STEP 1: Mark as synced
      markAsSynced(syncedIds);

      // STEP 2: PURGE — delete synced records from local DB
      const purged = deleteSyncedLogs();

      lastSyncTime = Date.now();
      isSyncing = false;

      const result: SyncResult = {
        success: true,
        synced: syncedIds.length,
        purged,
        message: `✅ Synced ${syncedIds.length} records. Local data purged.`,
        timestamp: lastSyncTime,
      };

      console.log('✅ Sync complete:', result.message);
      notifyListeners(result);
      return result;

    } else {
      throw new Error(`Server returned ${response.status}`);
    }

  } catch (error: any) {
    isSyncing = false;
    const pending = getPendingCount();

    const result: SyncResult = {
      success: false,
      synced: 0,
      purged: 0,
      message: `❌ Sync failed — ${pending} records kept safe for retry`,
      timestamp: Date.now(),
    };

    console.log('❌ Sync failed:', error.message);
    notifyListeners(result);
    return result;
  }
};

// ── Get last sync time for display ────────────────────────
export const getLastSyncTime = (): string => {
  if (!lastSyncTime) return 'Never';
  const diff = Math.floor((Date.now() - lastSyncTime) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return new Date(lastSyncTime).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

// ── Auto-sync when internet is restored ───────────────────
export const startNetworkListener = (): (() => void) => {
  console.log('📡 Network listener started');

  const unsubscribe = NetInfo.addEventListener(state => {
    const isOnline = state.isConnected && state.isInternetReachable;

    if (isOnline) {
      console.log('🌐 Internet restored — triggering auto-sync');
      const pending = getPendingCount();
      if (pending > 0) {
        // Small delay to let connection stabilize
        setTimeout(() => syncAttendanceLogs(), 1500);
      }
    } else {
      console.log('📴 Internet lost — operating offline');
    }
  });

  return unsubscribe;
};