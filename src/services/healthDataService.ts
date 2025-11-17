// src/services/healthDataService.ts
import { supabase } from '../lib/supabase';
import type { WatchData } from '../types/ble';

// Define the health metrics table name
const HEALTH_METRICS_TABLE = 'health_metrics';

// Helper to convert device ID (MAC address) to a valid UUID format
// This creates a deterministic UUID v5-like string from the device ID
const deviceIdToUUID = (deviceId: string): string => {
  // Simple hash-based UUID generation from device ID
  // Format: xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx (v5-like)
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    const char = deviceId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const hashStr = Math.abs(hash).toString(16).padStart(32, '0');
  return [
    hashStr.substring(0, 8),
    hashStr.substring(8, 12),
    '5' + hashStr.substring(13, 16),
    ((parseInt(hashStr.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hashStr.substring(18, 20),
    hashStr.substring(20, 32)
  ].join('-');
};

// Interface for the health metrics data
export interface HealthMetric {
  id?: string;
  user_id: string;
  device_id: string;
  device_name: string;
  device_type: string;
  heart_rate?: number;
  steps?: number;
  battery?: number;
  oxygen_saturation?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  calories?: number;
  sleep_duration?: number;
  sleep_quality?: string;
  deep_sleep?: number;
  light_sleep?: number;
  rem_sleep?: number;
  awake_time?: number;
  water_intake?: number;
  hydration_goal?: number;
  timestamp: string;
  created_at?: string;
}

// Save health metrics to Supabase
export const saveHealthMetrics = async (userId: string, deviceData: WatchData): Promise<HealthMetric | null> => {
  try {
    if (!userId || !deviceData.deviceName) {
      throw new Error('User ID and device name are required');
    }

    const now = new Date().toISOString();
    
    // Ensure device_id is set; if not, skip saving (don't use 'unknown')
    if (!deviceData.deviceId) {
      throw new Error('Device ID is required to save health metrics');
    }
    
    // Convert device ID to UUID format if it's not already a valid UUID
    const deviceIdValue = deviceData.deviceId.includes('-') ? deviceData.deviceId : deviceIdToUUID(deviceData.deviceId);
    
    const metric: Omit<HealthMetric, 'id' | 'created_at'> = {
      user_id: userId,
      device_id: deviceIdValue,
      device_name: deviceData.deviceName || 'Unknown Device',
      device_type: deviceData.deviceType || 'generic',
      heart_rate: deviceData.heartRate,
      steps: deviceData.steps,
      battery: deviceData.battery,
      oxygen_saturation: deviceData.oxygenSaturation, // Maps to blood_oxygen in DB
      blood_pressure_systolic: deviceData.bloodPressure?.systolic,
      blood_pressure_diastolic: deviceData.bloodPressure?.diastolic,
      calories: deviceData.calories,
      timestamp: deviceData.lastUpdated ? new Date(deviceData.lastUpdated).toISOString() : now,
    };

    const { data, error } = await supabase
      .from(HEALTH_METRICS_TABLE)
      .insert(metric)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving health metrics:', error);
    throw error;
  }
};

// Get health metrics for a user
export const getUserHealthMetrics = async (userId: string, limit = 50): Promise<HealthMetric[]> => {
  try {
    const { data, error } = await supabase
      .from(HEALTH_METRICS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    throw error;
  }
};

// Get health metrics summary for a user
export const getHealthSummary = async (userId: string, days = 7): Promise<any> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from(HEALTH_METRICS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Process data to get summary
    const summary = {
      averageHeartRate: 0,
      totalSteps: 0,
      averageOxygen: 0,
      latestMetrics: data?.[0] || null,
    };

    if (data && data.length > 0) {
      const heartRates = data.filter(d => d.heart_rate).map(d => d.heart_rate);
      const oxygenLevels = data.filter(d => d.oxygen_saturation).map(d => d.oxygen_saturation);
      const steps = data.filter(d => d.steps).map(d => d.steps);

      summary.averageHeartRate = Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length);
      summary.totalSteps = steps.reduce((a, b) => a + b, 0);
      summary.averageOxygen = Number((oxygenLevels.reduce((a, b) => a + b, 0) / oxygenLevels.length).toFixed(1));
    }

    return summary;
  } catch (error) {
    console.error('Error fetching health summary:', error);
    throw error;
  }
};