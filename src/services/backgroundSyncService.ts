// src/services/backgroundSyncService.ts
// Service to sync background collected metrics to database

import { backgroundDataService, StoredMetric } from './backgroundDataService';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SYNC_KEY = 'background_last_sync';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  error?: string;
}

/**
 * Sync all stored background metrics to the database
 */
export const syncBackgroundMetricsToDatabase = async (userId: string): Promise<SyncResult> => {
  try {
    // Get all stored metrics
    const storedMetrics = await backgroundDataService.getStoredMetrics();
    
    if (storedMetrics.length === 0) {
      console.log('[BackgroundSync] No metrics to sync');
      return { success: true, synced: 0, failed: 0 };
    }

    console.log(`[BackgroundSync] Syncing ${storedMetrics.length} metrics to database`);

    let synced = 0;
    let failed = 0;

    for (const metric of storedMetrics) {
      try {
        // Convert to health metrics format
        const healthMetric = {
          user_id: userId,
          device_id: metric.deviceId,
          device_name: metric.deviceName,
          device_type: 'generic',
          heart_rate: metric.heartRateAvg,
          heart_rate_min: metric.heartRateMin,
          heart_rate_max: metric.heartRateMax,
          steps: metric.stepsTotal,
          calories: metric.caloriesTotal,
          oxygen_saturation: metric.oxygenAvg,
          battery: metric.battery,
          timestamp: metric.timestamp,
        };

        const { error } = await supabase
          .from('health_metrics')
          .insert(healthMetric);

        if (error) {
          console.error(`[BackgroundSync] Failed to sync metric:`, error);
          failed++;
        } else {
          synced++;
        }
      } catch (error) {
        console.error('[BackgroundSync] Sync error for metric:', error);
        failed++;
      }
    }

    // Update last sync time
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } catch (e) {
      console.warn('[BackgroundSync] Failed to update last sync time:', e);
    }

    console.log(`[BackgroundSync] Sync complete: ${synced} synced, ${failed} failed`);

    // Clear synced metrics if all successful
    if (failed === 0 && synced > 0) {
      try {
        await backgroundDataService.clearStoredMetrics();
        console.log('[BackgroundSync] Cleared synced metrics from storage');
      } catch (e) {
        console.warn('[BackgroundSync] Failed to clear metrics:', e);
      }
    }

    return { success: failed === 0, synced, failed };
  } catch (error) {
    console.error('[BackgroundSync] Sync error:', error);
    return {
      success: false,
      synced: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get last sync time
 */
export const getLastSyncTime = async (): Promise<Date | null> => {
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? new Date(lastSync) : null;
  } catch (error) {
    console.error('[BackgroundSync] Failed to get last sync time:', error);
    return null;
  }
};

/**
 * Check if sync is needed (e.g., every 30 minutes)
 */
export const shouldSync = async (intervalMinutes = 30): Promise<boolean> => {
  try {
    const lastSync = await getLastSyncTime();
    if (!lastSync) return true;

    const now = new Date();
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    
    return diffMinutes >= intervalMinutes;
  } catch (error) {
    console.error('[BackgroundSync] Error checking sync status:', error);
    return false;
  }
};
