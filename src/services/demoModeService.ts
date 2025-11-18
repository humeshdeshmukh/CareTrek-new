// src/services/demoModeService.ts
// Demo mode service for testing without a real watch

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { mockDataService, MockHealthData } from './mockDataService';
import { HealthMetric } from './healthDataService';

const DEMO_MODE_KEY = 'demo_mode_enabled';
const DEMO_DEVICE_ID = 'demo-device-12345';
const DEMO_DEVICE_NAME = 'Demo Watch';

class DemoModeService {
  private isEnabled = false;
  private currentMockData: MockHealthData | null = null;

  /**
   * Initialize demo mode
   */
  async initialize() {
    try {
      const stored = await this.getStoredDemoMode();
      this.isEnabled = stored;
      console.log('[DemoMode] Initialized:', this.isEnabled ? 'ENABLED' : 'DISABLED');
    } catch (error) {
      console.warn('[DemoMode] Init error (non-fatal):', error);
      this.isEnabled = false;
    }
  }

  /**
   * Enable demo mode
   */
  async enable() {
    try {
      this.isEnabled = true;
      await this.setStoredDemoMode(true);
      console.log('[DemoMode] ENABLED');
      return true;
    } catch (error) {
      console.error('[DemoMode] Enable error:', error);
      return false;
    }
  }

  /**
   * Disable demo mode
   */
  async disable() {
    try {
      this.isEnabled = false;
      await this.setStoredDemoMode(false);
      console.log('[DemoMode] DISABLED');
      return true;
    } catch (error) {
      console.error('[DemoMode] Disable error:', error);
      return false;
    }
  }

  /**
   * Check if demo mode is enabled
   */
  isActive(): boolean {
    return this.isEnabled;
  }

  /**
   * Get current mock data
   */
  getMockData(): MockHealthData {
    if (!this.currentMockData) {
      this.currentMockData = mockDataService.generateMockData();
    }
    return this.currentMockData;
  }

  /**
   * Generate new mock data
   */
  generateNewMockData(): MockHealthData {
    this.currentMockData = mockDataService.generateMockData();
    return this.currentMockData;
  }

  /**
   * Save mock data to Supabase
   */
  async saveMockDataToSupabase(userId: string): Promise<HealthMetric | null> {
    try {
      if (!this.isEnabled) {
        throw new Error('Demo mode is not enabled');
      }

      const mockData = this.getMockData();
      const now = new Date().toISOString();

      const metric = {
        user_id: userId,
        device_id: DEMO_DEVICE_ID,
        device_name: DEMO_DEVICE_NAME,
        device_type: 'demo',
        heart_rate: mockData.heartRate,
        steps: mockData.steps,
        battery: mockData.battery,
        blood_oxygen: mockData.oxygenSaturation,
        blood_pressure_systolic: mockData.bloodPressure.systolic,
        blood_pressure_diastolic: mockData.bloodPressure.diastolic,
        calories_burned: mockData.calories,
        timestamp: now,
      };

      const { data, error } = await supabase
        .from('health_metrics')
        .insert(metric)
        .select()
        .single();

      if (error) throw error;
      console.log('[DemoMode] Data saved to Supabase:', data);
      return data;
    } catch (error) {
      console.error('[DemoMode] Save error:', error);
      throw error;
    }
  }

  /**
   * Generate and save multiple mock data points
   */
  async generateHistoricalData(userId: string, days = 7): Promise<HealthMetric[]> {
    try {
      if (!this.isEnabled) {
        throw new Error('Demo mode is not enabled');
      }

      const results: HealthMetric[] = [];
      const mockDataPoints = mockDataService.generateHistoricalData(days);

      for (let i = 0; i < mockDataPoints.length; i++) {
        const mockData = mockDataPoints[i];
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - (days - i - 1));

        const metric = {
          user_id: userId,
          device_id: DEMO_DEVICE_ID,
          device_name: DEMO_DEVICE_NAME,
          device_type: 'demo',
          heart_rate: mockData.heartRate,
          steps: mockData.steps,
          battery: mockData.battery,
          blood_oxygen: mockData.oxygenSaturation,
          blood_pressure_systolic: mockData.bloodPressure.systolic,
          blood_pressure_diastolic: mockData.bloodPressure.diastolic,
          calories_burned: mockData.calories,
          timestamp: timestamp.toISOString(),
        };

        const { data, error } = await supabase
          .from('health_metrics')
          .insert(metric)
          .select()
          .single();

        if (error) {
          console.warn('[DemoMode] Error saving data point:', error);
        } else if (data) {
          results.push(data);
        }
      }

      console.log('[DemoMode] Generated', results.length, 'historical data points');
      return results;
    } catch (error) {
      console.error('[DemoMode] Historical data generation error:', error);
      throw error;
    }
  }

  /**
   * Get stored demo mode state from AsyncStorage
   */
  private async getStoredDemoMode(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(DEMO_MODE_KEY);
      return stored === 'true';
    } catch (error) {
      console.warn('[DemoMode] Get stored state error:', error);
      return false;
    }
  }

  /**
   * Set stored demo mode state in AsyncStorage
   */
  private async setStoredDemoMode(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(DEMO_MODE_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      console.warn('[DemoMode] Set stored state error:', error);
    }
  }
}

export const demoModeService = new DemoModeService();
