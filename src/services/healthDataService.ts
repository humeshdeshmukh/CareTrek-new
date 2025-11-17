// src/services/healthDataService.ts
import { supabase } from '../lib/supabase';
import type { WatchData } from '../types/ble';

// Define the health metrics table name
const HEALTH_METRICS_TABLE = 'health_metrics';

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
    const metric: Omit<HealthMetric, 'id' | 'created_at'> = {
      user_id: userId,
      device_id: deviceData.deviceId || 'unknown',
      device_name: deviceData.deviceName,
      device_type: deviceData.deviceType || 'generic',
      heart_rate: deviceData.heartRate,
      steps: deviceData.steps,
      battery: deviceData.battery,
      oxygen_saturation: deviceData.oxygenSaturation,
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