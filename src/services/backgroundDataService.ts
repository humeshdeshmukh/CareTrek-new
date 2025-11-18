// src/services/backgroundDataService.ts
// Background data collection service for persistent watch connection and data aggregation

import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

export interface AggregatedMetrics {
  heartRateReadings: number[];
  stepsReadings: number[];
  caloriesReadings: number[];
  oxygenReadings: number[];
  batteryLevel?: number;
  lastUpdated: Date;
  collectionCount: number;
}

export interface StoredMetric {
  timestamp: string;
  heartRateAvg?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  stepsTotal?: number;
  caloriesTotal?: number;
  oxygenAvg?: number;
  battery?: number;
  deviceId: string;
  deviceName: string;
}

const METRICS_STORAGE_KEY = 'background_metrics';
const COLLECTION_INTERVAL = 30000; // Collect every 30 seconds
const SYNC_INTERVAL = 300000; // Sync to database every 5 minutes
const MAX_STORED_METRICS = 100; // Keep last 100 metric collections

class BackgroundDataService {
  private collectionTimer: ReturnType<typeof setInterval> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private aggregatedMetrics: AggregatedMetrics | null = null;
  private isCollecting = false;
  private connectedDevice: Device | null = null;
  private bleManager: BleManager | null = null;

  constructor() {
    this.aggregatedMetrics = null;
    this.isCollecting = false;
  }

  /**
   * Initialize background data collection
   */
  async initialize(device: Device, bleManager: BleManager) {
    try {
      this.connectedDevice = device;
      this.bleManager = bleManager;
      
      // Load any previously stored metrics
      await this.loadStoredMetrics();
      
      // Start collection and sync timers
      this.startCollectionTimer();
      this.startSyncTimer();
      
      console.log('[BackgroundData] Service initialized');
      return true;
    } catch (error) {
      console.error('[BackgroundData] Initialization error:', error);
      return false;
    }
  }

  /**
   * Start collecting metrics at regular intervals
   */
  private startCollectionTimer() {
    if (this.collectionTimer) clearInterval(this.collectionTimer);
    
    this.collectionTimer = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('[BackgroundData] Collection error:', error);
      }
    }, COLLECTION_INTERVAL);
  }

  /**
   * Start syncing aggregated metrics to database
   */
  private startSyncTimer() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncAggregatedMetrics();
      } catch (error) {
        console.error('[BackgroundData] Sync error:', error);
      }
    }, SYNC_INTERVAL);
  }

  /**
   * Collect metrics from connected device
   */
  private async collectMetrics() {
    if (!this.connectedDevice || this.isCollecting) return;
    
    this.isCollecting = true;
    try {
      if (!this.aggregatedMetrics) {
        this.aggregatedMetrics = {
          heartRateReadings: [],
          stepsReadings: [],
          caloriesReadings: [],
          oxygenReadings: [],
          lastUpdated: new Date(),
          collectionCount: 0
        };
      }

      // Try to read battery
      try {
        const batteryChar = await this.connectedDevice
          .readCharacteristicForService('180F', '2A19')
          .catch(() => null);
        
        if (batteryChar?.value) {
          const battery = Buffer.from(batteryChar.value, 'base64').readUInt8(0);
          if (battery >= 0 && battery <= 100) {
            this.aggregatedMetrics.batteryLevel = battery;
          }
        }
      } catch (error) {
        console.warn('[BackgroundData] Battery read error:', error);
      }

      this.aggregatedMetrics.collectionCount++;
      this.aggregatedMetrics.lastUpdated = new Date();
      
      console.log(`[BackgroundData] Collected metrics (count: ${this.aggregatedMetrics.collectionCount})`);
    } catch (error) {
      console.error('[BackgroundData] Metric collection failed:', error);
    } finally {
      this.isCollecting = false;
    }
  }

  /**
   * Add heart rate reading to aggregation
   */
  addHeartRateReading(value: number) {
    if (!this.aggregatedMetrics) {
      this.aggregatedMetrics = {
        heartRateReadings: [],
        stepsReadings: [],
        caloriesReadings: [],
        oxygenReadings: [],
        lastUpdated: new Date(),
        collectionCount: 0
      };
    }
    
    if (value >= 30 && value <= 220) {
      this.aggregatedMetrics.heartRateReadings.push(value);
      // Keep only last 100 readings
      if (this.aggregatedMetrics.heartRateReadings.length > 100) {
        this.aggregatedMetrics.heartRateReadings.shift();
      }
    }
  }

  /**
   * Add steps reading to aggregation
   */
  addStepsReading(value: number) {
    if (!this.aggregatedMetrics) {
      this.aggregatedMetrics = {
        heartRateReadings: [],
        stepsReadings: [],
        caloriesReadings: [],
        oxygenReadings: [],
        lastUpdated: new Date(),
        collectionCount: 0
      };
    }
    
    if (value >= 0 && value < 1000000) {
      this.aggregatedMetrics.stepsReadings.push(value);
      if (this.aggregatedMetrics.stepsReadings.length > 100) {
        this.aggregatedMetrics.stepsReadings.shift();
      }
    }
  }

  /**
   * Add calories reading to aggregation
   */
  addCaloriesReading(value: number) {
    if (!this.aggregatedMetrics) {
      this.aggregatedMetrics = {
        heartRateReadings: [],
        stepsReadings: [],
        caloriesReadings: [],
        oxygenReadings: [],
        lastUpdated: new Date(),
        collectionCount: 0
      };
    }
    
    if (value > 0 && value < 200000) {
      this.aggregatedMetrics.caloriesReadings.push(value);
      if (this.aggregatedMetrics.caloriesReadings.length > 100) {
        this.aggregatedMetrics.caloriesReadings.shift();
      }
    }
  }

  /**
   * Add oxygen reading to aggregation
   */
  addOxygenReading(value: number) {
    if (!this.aggregatedMetrics) {
      this.aggregatedMetrics = {
        heartRateReadings: [],
        stepsReadings: [],
        caloriesReadings: [],
        oxygenReadings: [],
        lastUpdated: new Date(),
        collectionCount: 0
      };
    }
    
    if (value >= 50 && value <= 100) {
      this.aggregatedMetrics.oxygenReadings.push(value);
      if (this.aggregatedMetrics.oxygenReadings.length > 100) {
        this.aggregatedMetrics.oxygenReadings.shift();
      }
    }
  }

  /**
   * Calculate averages and sync to storage
   */
  private async syncAggregatedMetrics() {
    if (!this.aggregatedMetrics || this.aggregatedMetrics.collectionCount === 0) {
      return;
    }

    try {
      const metric: StoredMetric = {
        timestamp: new Date().toISOString(),
        deviceId: this.connectedDevice?.id || 'unknown',
        deviceName: this.connectedDevice?.name || 'Unknown Device',
        battery: this.aggregatedMetrics.batteryLevel
      };

      // Calculate averages
      if (this.aggregatedMetrics.heartRateReadings.length > 0) {
        const readings = this.aggregatedMetrics.heartRateReadings;
        metric.heartRateAvg = Math.round(
          readings.reduce((a, b) => a + b, 0) / readings.length
        );
        metric.heartRateMin = Math.min(...readings);
        metric.heartRateMax = Math.max(...readings);
      }

      if (this.aggregatedMetrics.stepsReadings.length > 0) {
        metric.stepsTotal = Math.max(...this.aggregatedMetrics.stepsReadings);
      }

      if (this.aggregatedMetrics.caloriesReadings.length > 0) {
        metric.caloriesTotal = Math.max(...this.aggregatedMetrics.caloriesReadings);
      }

      if (this.aggregatedMetrics.oxygenReadings.length > 0) {
        const readings = this.aggregatedMetrics.oxygenReadings;
        metric.oxygenAvg = Math.round(
          readings.reduce((a, b) => a + b, 0) / readings.length
        );
      }

      // Store to AsyncStorage
      await this.storeMetric(metric);
      
      // Reset aggregation
      this.aggregatedMetrics = {
        heartRateReadings: [],
        stepsReadings: [],
        caloriesReadings: [],
        oxygenReadings: [],
        lastUpdated: new Date(),
        collectionCount: 0
      };

      console.log('[BackgroundData] Metrics synced to storage:', metric);
    } catch (error) {
      console.error('[BackgroundData] Sync error:', error);
    }
  }

  /**
   * Store metric to AsyncStorage
   */
  private async storeMetric(metric: StoredMetric) {
    try {
      const existing = await AsyncStorage.getItem(METRICS_STORAGE_KEY);
      const metrics: StoredMetric[] = existing ? JSON.parse(existing) : [];
      
      // Add new metric
      metrics.push(metric);
      
      // Keep only last MAX_STORED_METRICS
      if (metrics.length > MAX_STORED_METRICS) {
        metrics.splice(0, metrics.length - MAX_STORED_METRICS);
      }
      
      await AsyncStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
    } catch (error) {
      console.error('[BackgroundData] Storage error:', error);
    }
  }

  /**
   * Load previously stored metrics
   */
  private async loadStoredMetrics() {
    try {
      const stored = await AsyncStorage.getItem(METRICS_STORAGE_KEY);
      if (stored) {
        const metrics = JSON.parse(stored);
        console.log(`[BackgroundData] Loaded ${metrics.length} stored metrics`);
        return metrics;
      }
    } catch (error) {
      console.error('[BackgroundData] Load error:', error);
    }
    return [];
  }

  /**
   * Get all stored metrics
   */
  async getStoredMetrics(): Promise<StoredMetric[]> {
    try {
      const stored = await AsyncStorage.getItem(METRICS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[BackgroundData] Get metrics error:', error);
      return [];
    }
  }

  /**
   * Clear all stored metrics
   */
  async clearStoredMetrics() {
    try {
      await AsyncStorage.removeItem(METRICS_STORAGE_KEY);
      console.log('[BackgroundData] Stored metrics cleared');
    } catch (error) {
      console.error('[BackgroundData] Clear error:', error);
    }
  }

  /**
   * Stop background collection
   */
  stop() {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.connectedDevice = null;
    this.bleManager = null;
    console.log('[BackgroundData] Service stopped');
  }

  /**
   * Get current aggregated metrics
   */
  getAggregatedMetrics(): AggregatedMetrics | null {
    return this.aggregatedMetrics;
  }
}

// Export singleton instance
export const backgroundDataService = new BackgroundDataService();
