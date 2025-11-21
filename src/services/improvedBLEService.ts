// src/services/improvedBLEService.ts
// Improved BLE Service with connection pooling, exponential backoff, and state machine

import { BleManager, Device, Characteristic, State as BleState } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

export type ConnectionState = 'idle' | 'scanning' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected';

interface ConnectionPoolEntry {
  device: Device;
  lastUsed: number;
  isActive: boolean;
  retryCount: number;
}

interface BLEServiceConfig {
  maxRetries?: number;
  baseRetryDelay?: number; // milliseconds
  maxRetryDelay?: number; // milliseconds
  connectionTimeout?: number; // milliseconds
  keepAliveInterval?: number; // milliseconds
  maxPoolSize?: number;
}

export class ImprovedBLEService {
  private bleManager: BleManager;
  private connectionPool: Map<string, ConnectionPoolEntry> = new Map();
  private connectionState: ConnectionState = 'idle';
  private config: Required<BLEServiceConfig>;
  private stateChangeCallbacks: ((state: ConnectionState) => void)[] = [];
  private keepAliveIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: BLEServiceConfig = {}) {
    this.bleManager = new BleManager();
    this.config = {
      maxRetries: config.maxRetries ?? 5,
      baseRetryDelay: config.baseRetryDelay ?? 1000,
      maxRetryDelay: config.maxRetryDelay ?? 30000,
      connectionTimeout: config.connectionTimeout ?? 15000,
      keepAliveInterval: config.keepAliveInterval ?? 30000,
      maxPoolSize: config.maxPoolSize ?? 10,
    };
  }

  // ========== State Machine ==========
  private setConnectionState(state: ConnectionState) {
    if (this.connectionState !== state) {
      console.log(`[BLE] State transition: ${this.connectionState} -> ${state}`);
      this.connectionState = state;
      this.stateChangeCallbacks.forEach(cb => cb(state));
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  onStateChange(callback: (state: ConnectionState) => void): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  // ========== Connection Pooling ==========
  private addToPool(device: Device): void {
    if (this.connectionPool.size >= this.config.maxPoolSize) {
      // Remove least recently used
      let lruKey: string | null = null;
      let lruTime = Infinity;
      for (const [key, entry] of this.connectionPool.entries()) {
        if (!entry.isActive && entry.lastUsed < lruTime) {
          lruKey = key;
          lruTime = entry.lastUsed;
        }
      }
      if (lruKey) {
        this.connectionPool.delete(lruKey);
        console.log(`[BLE] Removed LRU device from pool: ${lruKey}`);
      }
    }

    this.connectionPool.set(device.id, {
      device,
      lastUsed: Date.now(),
      isActive: true,
      retryCount: 0,
    });
  }

  private getFromPool(deviceId: string): Device | null {
    const entry = this.connectionPool.get(deviceId);
    if (entry) {
      entry.lastUsed = Date.now();
      return entry.device;
    }
    return null;
  }

  private removeFromPool(deviceId: string): void {
    this.connectionPool.delete(deviceId);
    this.stopKeepAlive(deviceId);
    this.cancelReconnect(deviceId);
  }

  // ========== Exponential Backoff Retry ==========
  private calculateBackoffDelay(retryCount: number): number {
    const delay = this.config.baseRetryDelay * Math.pow(2, retryCount);
    return Math.min(delay, this.config.maxRetryDelay);
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = this.config.maxRetries
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[BLE] ${operationName} - Attempt ${attempt + 1}/${maxRetries}`);
        return await Promise.race([
          operation(),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), this.config.connectionTimeout)
          ),
        ]);
      } catch (error) {
        lastError = error;
        console.warn(`[BLE] ${operationName} failed (attempt ${attempt + 1}):`, error);

        if (attempt < maxRetries - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          console.log(`[BLE] Retrying ${operationName} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`${operationName} failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  // ========== Connection Management ==========
  async connectToDevice(device: Device): Promise<Device> {
    try {
      this.setConnectionState('connecting');

      // Check if already in pool
      const pooledDevice = this.getFromPool(device.id);
      if (pooledDevice) {
        console.log(`[BLE] Using pooled device: ${device.id}`);
        this.setConnectionState('connected');
        return pooledDevice;
      }

      // Connect with backoff
      const connectedDevice = await this.retryWithBackoff(
        () => device.connect(),
        `Connect to ${device.name || device.id}`
      );

      // Discover services (with delay for stability)
      // Some watches need time to stabilize after connection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.retryWithBackoff(
        async () => {
          try {
            return await connectedDevice.discoverAllServicesAndCharacteristics();
          } catch (error: any) {
            // Log detailed error info
            console.error('[BLE] Service discovery error details:', {
              message: error?.message,
              reason: error?.reason,
              code: error?.code,
              nativeErrorCode: error?.nativeErrorCode
            });
            throw error;
          }
        },
        `Discover services for ${device.name || device.id}`,
        5 // Increased retries for discovery
      );

      // Add to pool
      this.addToPool(connectedDevice);

      // Start keep-alive
      this.startKeepAlive(connectedDevice.id);

      this.setConnectionState('connected');
      console.log(`[BLE] Successfully connected to ${device.name || device.id}`);

      return connectedDevice;
    } catch (error) {
      this.setConnectionState('error');
      throw error;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      const device = this.getFromPool(deviceId);
      if (device) {
        await device.cancelConnection().catch(() => null);
      }
      this.removeFromPool(deviceId);
      this.setConnectionState('disconnected');
      console.log(`[BLE] Disconnected from ${deviceId}`);
    } catch (error) {
      console.error(`[BLE] Error disconnecting from ${deviceId}:`, error);
    }
  }

  // ========== Keep-Alive & Auto-Reconnect ==========
  private startKeepAlive(deviceId: string): void {
    // Clear existing interval
    this.stopKeepAlive(deviceId);

    const interval = setInterval(async () => {
      try {
        const device = this.getFromPool(deviceId);
        if (!device) {
          this.stopKeepAlive(deviceId);
          return;
        }

        // Try to read battery to keep connection alive
        await device.readCharacteristicForService('180F', '2A19').catch(() => null);
        console.log(`[BLE] Keep-alive ping successful for ${deviceId}`);
      } catch (error) {
        console.warn(`[BLE] Keep-alive failed for ${deviceId}, attempting reconnect:`, error);
        this.attemptReconnect(deviceId);
      }
    }, this.config.keepAliveInterval);

    this.keepAliveIntervals.set(deviceId, interval);
  }

  private stopKeepAlive(deviceId: string): void {
    const interval = this.keepAliveIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.keepAliveIntervals.delete(deviceId);
    }
  }

  private attemptReconnect(deviceId: string): void {
    // Clear existing reconnect timeout
    this.cancelReconnect(deviceId);

    const entry = this.connectionPool.get(deviceId);
    if (!entry) return;

    this.setConnectionState('reconnecting');

    const timeout = setTimeout(async () => {
      try {
        console.log(`[BLE] Attempting reconnect for ${deviceId} (retry ${entry.retryCount + 1})`);
        const device = entry.device;

        // Try to reconnect
        await this.connectToDevice(device);
        entry.retryCount = 0; // Reset on success
      } catch (error) {
        entry.retryCount++;
        console.error(`[BLE] Reconnect failed for ${deviceId}:`, error);

        if (entry.retryCount < this.config.maxRetries) {
          const delay = this.calculateBackoffDelay(entry.retryCount);
          console.log(`[BLE] Scheduling next reconnect in ${delay}ms`);
          this.reconnectTimeouts.set(deviceId, setTimeout(() => this.attemptReconnect(deviceId), delay));
        } else {
          console.error(`[BLE] Max reconnect attempts reached for ${deviceId}`);
          this.removeFromPool(deviceId);
          this.setConnectionState('error');
        }
      }
    }, 1000);

    this.reconnectTimeouts.set(deviceId, timeout);
  }

  private cancelReconnect(deviceId: string): void {
    const timeout = this.reconnectTimeouts.get(deviceId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(deviceId);
    }
  }

  // ========== Characteristic Operations ==========
  async readCharacteristic(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string
  ): Promise<Characteristic | null> {
    try {
      const device = this.getFromPool(deviceId);
      if (!device) throw new Error(`Device ${deviceId} not in pool`);

      return await this.retryWithBackoff(
        () => device.readCharacteristicForService(serviceUUID, characteristicUUID),
        `Read characteristic ${characteristicUUID}`,
        2
      );
    } catch (error) {
      console.error(`[BLE] Failed to read characteristic:`, error);
      return null;
    }
  }

  monitorCharacteristic(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    callback: (error: Error | null, characteristic: Characteristic | null) => void
  ): (() => void) | null {
    try {
      const device = this.getFromPool(deviceId);
      if (!device) {
        callback(new Error(`Device ${deviceId} not in pool`), null);
        return null;
      }

      const subscription = device.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
          if (error) {
            console.error(`[BLE] Monitor error for ${characteristicUUID}:`, error);
            callback(error, null);
          } else {
            callback(null, characteristic);
          }
        }
      );

      return () => {
        try {
          (subscription as any).remove?.();
          (subscription as any).cancel?.();
        } catch (e) {
          console.warn('Error canceling subscription:', e);
        }
      };
    } catch (error) {
      console.error(`[BLE] Failed to monitor characteristic:`, error);
      callback(error as Error, null);
      return null;
    }
  }

  // ========== Scanning ==========
  async startScan(
    callback: (error: Error | null, device: Device | null) => void,
    scanDuration: number = 10000
  ): Promise<void> {
    try {
      this.setConnectionState('scanning');
      console.log('[BLE] Starting device scan...');

      // Start the scan immediately
      this.bleManager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('[BLE] Scan error:', error);
            callback(error, null);
          } else if (device) {
            // Only show devices with names (filter out unknown devices)
            if (device.name && device.name.trim().length > 0) {
              console.log('[BLE] Found device:', device.name);
              callback(null, device);
            } else {
              // Silently skip unnamed devices
              console.log('[BLE] Skipping unnamed device:', device.id);
            }
          }
        }
      );

      // Auto-stop scan after duration
      const scanTimeout = setTimeout(() => {
        console.log('[BLE] Scan duration ended, stopping scan');
        this.stopScan();
      }, scanDuration);

      // Store timeout for cleanup if needed
      if (!this.reconnectTimeouts.has('scan-timeout')) {
        this.reconnectTimeouts.set('scan-timeout', scanTimeout);
      }
    } catch (error) {
      console.error('[BLE] Error starting scan:', error);
      this.setConnectionState('error');
      callback(error as Error, null);
    }
  }

  stopScan(): void {
    try {
      this.bleManager.stopDeviceScan();
      if (this.connectionState === 'scanning') {
        this.setConnectionState('idle');
      }
    } catch (error) {
      console.error('[BLE] Error stopping scan:', error);
    }
  }

  // ========== Cleanup ==========
  async destroy(): Promise<void> {
    try {
      // Stop all keep-alive intervals
      for (const [deviceId] of this.keepAliveIntervals) {
        this.stopKeepAlive(deviceId);
      }

      // Cancel all reconnect timeouts
      for (const [deviceId] of this.reconnectTimeouts) {
        this.cancelReconnect(deviceId);
      }

      // Disconnect all devices
      for (const [deviceId] of this.connectionPool) {
        await this.disconnectDevice(deviceId);
      }

      // Stop scan
      this.stopScan();

      // Destroy manager
      await this.bleManager.destroy();

      this.connectionPool.clear();
      this.stateChangeCallbacks = [];
      this.setConnectionState('idle');

      console.log('[BLE] Service destroyed');
    } catch (error) {
      console.error('[BLE] Error destroying service:', error);
    }
  }

  // ========== Diagnostics ==========
  getPoolStatus(): { deviceId: string; isActive: boolean; retryCount: number; lastUsed: number }[] {
    return Array.from(this.connectionPool.entries()).map(([deviceId, entry]) => ({
      deviceId,
      isActive: entry.isActive,
      retryCount: entry.retryCount,
      lastUsed: entry.lastUsed,
    }));
  }

  getMetrics() {
    return {
      connectionState: this.connectionState,
      poolSize: this.connectionPool.size,
      activeDevices: Array.from(this.connectionPool.values()).filter(e => e.isActive).length,
      keepAliveIntervals: this.keepAliveIntervals.size,
      pendingReconnects: this.reconnectTimeouts.size,
    };
  }
}

// Singleton instance
let improvedBLEService: ImprovedBLEService | null = null;

export const getImprovedBLEService = (config?: BLEServiceConfig): ImprovedBLEService => {
  if (!improvedBLEService) {
    improvedBLEService = new ImprovedBLEService(config);
  }
  return improvedBLEService;
};

export const destroyImprovedBLEService = async (): Promise<void> => {
  if (improvedBLEService) {
    await improvedBLEService.destroy();
    improvedBLEService = null;
  }
};
