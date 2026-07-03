import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const SYNC_QUEUE_KEY = 'attendance_sync_queue';

export interface SyncQueueItem {
  id: string;
  tableName: string;
  action: 'create' | 'update' | 'delete';
  payload: Record<string, any>;
  deviceTimestamp: string;
  retryCount: number;
  createdAt: string;
}

export async function addToSyncQueue(
  tableName: string,
  action: 'create' | 'update' | 'delete',
  payload: Record<string, any>,
): Promise<void> {
  const queue = await getSyncQueue();
  queue.push({
    id: generateId(),
    tableName,
    action,
    payload,
    deviceTimestamp: new Date().toISOString(),
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getPendingCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}

export async function flushSyncQueue(
  terminalId?: number,
): Promise<{synced: number; failed: number}> {
  const queue = await getSyncQueue();
  if (queue.length === 0) return {synced: 0, failed: 0};

  const terminalIdFinal =
    terminalId ||
    parseInt((await AsyncStorage.getItem('terminal_id')) || '0', 10);

  if (!terminalIdFinal) {
    return {synced: 0, failed: queue.length};
  }

  try {
    const records = queue.map(item => ({
      table_name: item.tableName,
      action: item.action,
      payload: item.payload,
      device_timestamp: item.deviceTimestamp,
    }));

    const batchSize = 100;
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      try {
        const response = await apiClient.post('/offline-sync/batch', {
          terminal_id: terminalIdFinal,
          records: batch,
        });

        if (response.status === 201) {
          synced += batch.length;
        } else {
          failed += batch.length;
        }
      } catch {
        failed += batch.length;
      }
    }

    const failedItems = queue.filter(
      (_, i) => i >= queue.length - failed,
    );
    const updatedQueue = failedItems.map(item => ({
      ...item,
      retryCount: item.retryCount + 1,
    }));

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));

    return {synced, failed};
  } catch {
    return {synced: 0, failed: queue.length};
  }
}

function generateId(): string {
  return 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
