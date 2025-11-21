// src/services/localHealthDataService.ts
// Local storage service for health data with crash prevention

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchData } from '../types/ble';

const STORAGE_KEYS = {
  CURRENT_METRICS: 'health_current_metrics',
  METRICS_HISTORY: 'health_metrics_history',
  AGGREGATED_METRICS: 'health_aggregated_metrics',
  LAST_SYNC_TIME: 'health_last_sync_time',
  PENDING_SYNC: 'health_pending_sync',
};

interface StoredMetric {
  timestamp: number;
  heartRate?: number;
  steps?: number;
  battery?: number;
  oxygenSaturation?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  calories?: number;
  deviceId?: string;
  deviceName?: string;
}

interface AggregatedMetric {
  timestamp: number;
  heartRateAvg?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  stepsTotal?: number;
  caloriesTotal?: number;
  oxygenAvg?: number;
  battery?: number;
  deviceId?: string;
  deviceName?: string;
  readingsCount: number;
}

class LocalHealthDataService {
  private metricsBuffer: StoredMetric[] = [];
  private aggregationInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly AGGREGATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the service and load existing data
   */
  async initialize(): Promise<void> {
    try {
      console.log('[LocalHealth] Initializing local health data service');
      
      // Load existing metrics from storage
      await this.loadMetricsFromStorage();
      
      // Start aggregation interval
      this.startAggregation();
      
      console.log('[LocalHealth] Service initialized successfully');
    } catch (error) {
      console.error('[LocalHealth] Initialization error:', error);
    }
  }

  /**
   * Save a single metric immediately to prevent data loss
   */
  async saveMetricImmediately(metric: Partial<WatchData>): Promise<void> {
    try {
      const storedMetric: StoredMetric = {
        timestamp: Date.now(),
        heartRate: metric.heartRate,
        steps: metric.steps,
        battery: metric.battery,
        oxygenSaturation: metric.oxygenSaturation,
        bloodPressure: metric.bloodPressure || undefined,
        calories: metric.calories,
        deviceId: metric.deviceId,
        deviceName: metric.deviceName,
      };

      // Add to buffer
      this.metricsBuffer.push(storedMetric);

      // Save to AsyncStorage immediately
      await this.saveCurrentMetric(storedMetric);

      // If buffer is full, aggregate and clear
      if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
        await this.aggregateAndClear();
      }

      console.log('[LocalHealth] Metric saved:', {
        hr: metric.heartRate,
        steps: metric.steps,
        battery: metric.battery,
        bufferSize: this.metricsBuffer.length,
      });
    } catch (error) {
      console.error('[LocalHealth] Error saving metric:', error);
      // Don't throw - prevent app crash
    }
  }

  /**
   * Save current metric to AsyncStorage
   */
  private async saveCurrentMetric(metric: StoredMetric): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CURRENT_METRICS,
        JSON.stringify(metric)
      );
    } catch (error) {
      console.error('[LocalHealth] Error saving current metric to storage:', error);
    }
  }

  /**
   * Get current metric from storage
   */
  async getCurrentMetric(): Promise<StoredMetric | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_METRICS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[LocalHealth] Error getting current metric:', error);
      return null;
    }
  }

  /**
   * Load metrics history from storage
   */
  private async loadMetricsFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.METRICS_HISTORY);
      if (data) {
        this.metricsBuffer = JSON.parse(data);
        console.log('[LocalHealth] Loaded', this.metricsBuffer.length, 'metrics from storage');
      }
    } catch (error) {
      console.error('[LocalHealth] Error loading metrics from storage:', error);
      this.metricsBuffer = [];
    }
  }

  /**
   * Start periodic aggregation
   */
  private startAggregation(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }

    this.aggregationInterval = setInterval(async () => {
      try {
        await this.aggregateAndClear();
      } catch (error) {
        console.error('[LocalHealth] Aggregation error:', error);
      }
    }, this.AGGREGATION_INTERVAL);

    console.log('[LocalHealth] Aggregation started (interval:', this.AGGREGATION_INTERVAL, 'ms)');
  }

  /**
   * Aggregate metrics and clear buffer
   */
  private async aggregateAndClear(): Promise<void> {
    try {
      if (this.metricsBuffer.length === 0) {
        return;
      }

      const aggregated = this.aggregateMetrics(this.metricsBuffer);
      
      // Save aggregated metrics
      await this.saveAggregatedMetric(aggregated);

      // Save metrics history
      await this.saveMetricsHistory(this.metricsBuffer);

      console.log('[LocalHealth] Aggregated', this.metricsBuffer.length, 'metrics');

      // Clear buffer
      this.metricsBuffer = [];
    } catch (error) {
      console.error('[LocalHealth] Error during aggregation:', error);
    }
  }

  /**
   * Aggregate metrics using averages and totals
   */
  private aggregateMetrics(metrics: StoredMetric[]): AggregatedMetric {
    const heartRates = metrics
      .filter(m => m.heartRate !== undefined)
      .map(m => m.heartRate!);
    
    const oxygens = metrics
      .filter(m => m.oxygenSaturation !== undefined)
      .map(m => m.oxygenSaturation!);

    const aggregated: AggregatedMetric = {
      timestamp: Date.now(),
      readingsCount: metrics.length,
      deviceId: metrics[metrics.length - 1]?.deviceId,
      deviceName: metrics[metrics.length - 1]?.deviceName,
    };

    // Heart rate aggregation
    if (heartRates.length > 0) {
      aggregated.heartRateAvg = Math.round(
        heartRates.reduce((a, b) => a + b, 0) / heartRates.length
      );
      aggregated.heartRateMin = Math.min(...heartRates);
      aggregated.heartRateMax = Math.max(...heartRates);
    }

    // Oxygen aggregation
    if (oxygens.length > 0) {
      aggregated.oxygenAvg = Math.round(
        oxygens.reduce((a, b) => a + b, 0) / oxygens.length
      );
    }

    // Steps and calories (totals)
    const lastMetric = metrics[metrics.length - 1];
    if (lastMetric?.steps !== undefined) {
      aggregated.stepsTotal = lastMetric.steps;
    }
    if (lastMetric?.calories !== undefined) {
      aggregated.caloriesTotal = lastMetric.calories;
    }
    if (lastMetric?.battery !== undefined) {
      aggregated.battery = lastMetric.battery;
    }

    return aggregated;
  }

  /**
   * Save aggregated metric to storage
   */
  private async saveAggregatedMetric(metric: AggregatedMetric): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.AGGREGATED_METRICS);
      const metrics: AggregatedMetric[] = existing ? JSON.parse(existing) : [];
      
      metrics.push(metric);
      
      // Keep only last 100 aggregated metrics
      if (metrics.length > 100) {
        metrics.shift();
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.AGGREGATED_METRICS,
        JSON.stringify(metrics)
      );

      console.log('[LocalHealth] Saved aggregated metric. Total:', metrics.length);
    } catch (error) {
      console.error('[LocalHealth] Error saving aggregated metric:', error);
    }
  }

  /**
   * Save metrics history
   */
  private async saveMetricsHistory(metrics: StoredMetric[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.METRICS_HISTORY,
        JSON.stringify(metrics)
      );
    } catch (error) {
      console.error('[LocalHealth] Error saving metrics history:', error);
    }
  }

  /**
   * Get all aggregated metrics
   */
  async getAggregatedMetrics(): Promise<AggregatedMetric[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.AGGREGATED_METRICS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[LocalHealth] Error getting aggregated metrics:', error);
      return [];
    }
  }

  /**
   * Get metrics history
   */
  async getMetricsHistory(): Promise<StoredMetric[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.METRICS_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[LocalHealth] Error getting metrics history:', error);
      return [];
    }
  }

  /**
   * Mark metrics as pending sync
   */
  async markAsPendingSync(metrics: AggregatedMetric[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_SYNC,
        JSON.stringify(metrics)
      );
    } catch (error) {
      console.error('[LocalHealth] Error marking as pending sync:', error);
    }
  }

  /**
   * Get pending sync metrics
   */
  async getPendingSyncMetrics(): Promise<AggregatedMetric[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[LocalHealth] Error getting pending sync metrics:', error);
      return [];
    }
  }

  /**
   * Clear pending sync
   */
  async clearPendingSync(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
    } catch (error) {
      console.error('[LocalHealth] Error clearing pending sync:', error);
    }
  }

  /**
   * Save last sync time
   */
  async saveLastSyncTime(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC_TIME,
        JSON.stringify(timestamp)
      );
    } catch (error) {
      console.error('[LocalHealth] Error saving last sync time:', error);
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[LocalHealth] Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.metricsBuffer.length;
  }

  /**
   * Get current buffer
   */
  getBuffer(): StoredMetric[] {
    return [...this.metricsBuffer];
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CURRENT_METRICS,
        STORAGE_KEYS.METRICS_HISTORY,
        STORAGE_KEYS.AGGREGATED_METRICS,
        STORAGE_KEYS.LAST_SYNC_TIME,
        STORAGE_KEYS.PENDING_SYNC,
      ]);
      this.metricsBuffer = [];
      console.log('[LocalHealth] All data cleared');
    } catch (error) {
      console.error('[LocalHealth] Error clearing data:', error);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
    this.metricsBuffer = [];
    console.log('[LocalHealth] Service destroyed');
  }

  /**
   * Get service stats
   */
  async getStats(): Promise<{
    bufferSize: number;
    aggregatedCount: number;
    historyCount: number;
    lastSyncTime: number | null;
    pendingSyncCount: number;
  }> {
    try {
      const aggregated = await this.getAggregatedMetrics();
      const history = await this.getMetricsHistory();
      const lastSync = await this.getLastSyncTime();
      const pending = await this.getPendingSyncMetrics();

      return {
        bufferSize: this.metricsBuffer.length,
        aggregatedCount: aggregated.length,
        historyCount: history.length,
        lastSyncTime: lastSync,
        pendingSyncCount: pending.length,
      };
    } catch (error) {
      console.error('[LocalHealth] Error getting stats:', error);
      return {
        bufferSize: 0,
        aggregatedCount: 0,
        historyCount: 0,
        lastSyncTime: null,
        pendingSyncCount: 0,
      };
    }
  }
}

// Singleton instance
let localHealthDataService: LocalHealthDataService | null = null;

export const getLocalHealthDataService = (): LocalHealthDataService => {
  if (!localHealthDataService) {
    localHealthDataService = new LocalHealthDataService();
  }
  return localHealthDataService;
};

export const destroyLocalHealthDataService = (): void => {
  if (localHealthDataService) {
    localHealthDataService.destroy();
    localHealthDataService = null;
  }
};

export default LocalHealthDataService;
