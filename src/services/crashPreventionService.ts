// src/services/crashPreventionService.ts
// Comprehensive crash prevention service for BLE operations

import { Alert } from 'react-native';

interface ErrorLog {
  timestamp: number;
  error: string;
  stack?: string;
  context: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class CrashPreventionService {
  private errorLogs: ErrorLog[] = [];
  private readonly MAX_LOGS = 100;
  private crashCount = 0;
  private lastCrashTime = 0;

  /**
   * Safe wrapper for async operations
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      console.log(`[CrashPrevention] Executing: ${context}`);
      const result = await operation();
      console.log(`[CrashPrevention] Success: ${context}`);
      return result;
    } catch (error) {
      this.logError(error, context, 'high');
      console.error(`[CrashPrevention] Error in ${context}:`, error);
      return fallback;
    }
  }

  /**
   * Safe wrapper for sync operations
   */
  safeExecuteSync<T>(
    operation: () => T,
    context: string,
    fallback?: T
  ): T | undefined {
    try {
      console.log(`[CrashPrevention] Executing (sync): ${context}`);
      const result = operation();
      console.log(`[CrashPrevention] Success (sync): ${context}`);
      return result;
    } catch (error) {
      this.logError(error, context, 'high');
      console.error(`[CrashPrevention] Error in ${context}:`, error);
      return fallback;
    }
  }

  /**
   * Safe callback wrapper for BLE operations
   */
  createSafeCallback<T extends any[]>(
    callback: (...args: T) => void,
    context: string
  ): (...args: T) => void {
    return (...args: T) => {
      try {
        callback(...args);
      } catch (error) {
        this.logError(error, `Callback: ${context}`, 'high');
        console.error(`[CrashPrevention] Callback error in ${context}:`, error);
      }
    };
  }

  /**
   * Validate characteristic data before processing
   */
  validateCharacteristicData(
    value: string | undefined | null,
    context: string
  ): boolean {
    try {
      if (!value) {
        console.warn(`[CrashPrevention] Invalid characteristic data in ${context}`);
        return false;
      }

      if (typeof value !== 'string') {
        console.warn(`[CrashPrevention] Invalid data type in ${context}`);
        return false;
      }

      if (value.length === 0) {
        console.warn(`[CrashPrevention] Empty characteristic data in ${context}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logError(error, `Validate: ${context}`, 'medium');
      return false;
    }
  }

  /**
   * Validate numeric value range
   */
  validateNumericRange(
    value: number,
    min: number,
    max: number,
    context: string
  ): boolean {
    try {
      if (typeof value !== 'number' || isNaN(value)) {
        console.warn(`[CrashPrevention] Invalid numeric value in ${context}`);
        return false;
      }

      if (value < min || value > max) {
        console.warn(
          `[CrashPrevention] Value ${value} out of range [${min}, ${max}] in ${context}`
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logError(error, `Validate Range: ${context}`, 'medium');
      return false;
    }
  }

  /**
   * Validate buffer before reading
   */
  validateBuffer(
    buffer: any,
    minLength: number,
    context: string
  ): boolean {
    try {
      if (!buffer) {
        console.warn(`[CrashPrevention] Invalid buffer in ${context}`);
        return false;
      }

      if (buffer.length < minLength) {
        console.warn(
          `[CrashPrevention] Buffer too short (${buffer.length} < ${minLength}) in ${context}`
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logError(error, `Validate Buffer: ${context}`, 'medium');
      return false;
    }
  }

  /**
   * Safe state update wrapper
   */
  safeStateUpdate(
    setState: (state: any) => void,
    newState: any,
    context: string
  ): void {
    try {
      if (!setState || typeof setState !== 'function') {
        console.warn(`[CrashPrevention] Invalid setState in ${context}`);
        return;
      }

      if (!newState || typeof newState !== 'object') {
        console.warn(`[CrashPrevention] Invalid state object in ${context}`);
        return;
      }

      setState(newState);
      console.log(`[CrashPrevention] State updated: ${context}`);
    } catch (error) {
      this.logError(error, `State Update: ${context}`, 'high');
      console.error(`[CrashPrevention] Error updating state in ${context}:`, error);
    }
  }

  /**
   * Log error with context
   */
  private logError(
    error: any,
    context: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    const errorLog: ErrorLog = {
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      severity,
    };

    this.errorLogs.push(errorLog);

    // Keep only recent logs
    if (this.errorLogs.length > this.MAX_LOGS) {
      this.errorLogs.shift();
    }

    // Track crash frequency
    if (severity === 'critical') {
      this.crashCount++;
      this.lastCrashTime = Date.now();
    }

    console.log(`[CrashPrevention] Error logged (${severity}):`, errorLog);
  }

  /**
   * Get error logs
   */
  getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * Get crash statistics
   */
  getCrashStats(): {
    totalErrors: number;
    criticalErrors: number;
    lastCrashTime: number;
    crashFrequency: number;
  } {
    const criticalErrors = this.errorLogs.filter(
      (log) => log.severity === 'critical'
    ).length;

    return {
      totalErrors: this.errorLogs.length,
      criticalErrors,
      lastCrashTime: this.lastCrashTime,
      crashFrequency: this.crashCount,
    };
  }

  /**
   * Clear error logs
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
    this.crashCount = 0;
    this.lastCrashTime = 0;
    console.log('[CrashPrevention] Error logs cleared');
  }

  /**
   * Show error alert to user
   */
  showErrorAlert(title: string, message: string): void {
    try {
      Alert.alert(title, message, [{ text: 'OK', onPress: () => {} }]);
    } catch (error) {
      console.error('[CrashPrevention] Error showing alert:', error);
    }
  }

  /**
   * Handle connection error gracefully
   */
  handleConnectionError(error: any, deviceName?: string): void {
    const message = error instanceof Error ? error.message : String(error);
    const context = `Connection Error: ${deviceName || 'Unknown Device'}`;

    this.logError(error, context, 'critical');

    console.error('[CrashPrevention] Connection failed:', {
      device: deviceName,
      error: message,
      timestamp: new Date().toISOString(),
    });

    // Show user-friendly message
    this.showErrorAlert(
      'Connection Failed',
      `Failed to connect to ${deviceName || 'device'}. Please try again.`
    );
  }

  /**
   * Handle BLE characteristic error
   */
  handleCharacteristicError(
    error: any,
    characteristicName: string
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    const context = `Characteristic Error: ${characteristicName}`;

    this.logError(error, context, 'high');

    console.warn('[CrashPrevention] Characteristic error:', {
      characteristic: characteristicName,
      error: message,
    });
  }

  /**
   * Handle data parsing error
   */
  handleParsingError(error: any, dataType: string): void {
    const message = error instanceof Error ? error.message : String(error);
    const context = `Parsing Error: ${dataType}`;

    this.logError(error, context, 'medium');

    console.warn('[CrashPrevention] Data parsing error:', {
      dataType,
      error: message,
    });
  }

  /**
   * Validate connection state before operation
   */
  isConnectionValid(
    isConnected: boolean,
    deviceId?: string,
    context?: string
  ): boolean {
    if (!isConnected) {
      console.warn(
        `[CrashPrevention] Connection not active in ${context || 'unknown context'}`
      );
      return false;
    }

    if (!deviceId) {
      console.warn(
        `[CrashPrevention] No device ID in ${context || 'unknown context'}`
      );
      return false;
    }

    return true;
  }

  /**
   * Safe JSON parse
   */
  safeJsonParse<T>(jsonString: string, fallback: T, context: string): T {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      this.logError(error, `JSON Parse: ${context}`, 'medium');
      console.warn(`[CrashPrevention] JSON parse error in ${context}`);
      return fallback;
    }
  }

  /**
   * Safe JSON stringify
   */
  safeJsonStringify(obj: any, fallback: string = '{}', context: string = ''): string {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      this.logError(error, `JSON Stringify: ${context}`, 'medium');
      console.warn(`[CrashPrevention] JSON stringify error in ${context}`);
      return fallback;
    }
  }

  /**
   * Debounce rapid operations
   */
  createDebounce<T extends any[]>(
    func: (...args: T) => void,
    delay: number,
    context: string
  ): (...args: T) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastCallTime = 0;

    return (...args: T) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        try {
          func(...args);
          lastCallTime = Date.now();
        } catch (error) {
          this.logError(error, `Debounced: ${context}`, 'high');
        }
      }, delay);
    };
  }

  /**
   * Create throttle function
   */
  createThrottle<T extends any[]>(
    func: (...args: T) => void,
    delay: number,
    context: string
  ): (...args: T) => void {
    let lastCallTime = 0;

    return (...args: T) => {
      const now = Date.now();

      if (now - lastCallTime >= delay) {
        try {
          func(...args);
          lastCallTime = now;
        } catch (error) {
          this.logError(error, `Throttled: ${context}`, 'high');
        }
      }
    };
  }
}

// Singleton instance
let crashPreventionService: CrashPreventionService | null = null;

export const getCrashPreventionService = (): CrashPreventionService => {
  if (!crashPreventionService) {
    crashPreventionService = new CrashPreventionService();
  }
  return crashPreventionService;
};

export default CrashPreventionService;
