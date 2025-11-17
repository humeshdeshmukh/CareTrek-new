// src/services/sleepTrackingService.ts
import { supabase } from '../lib/supabase';

export interface SleepRecord {
  id?: string;
  user_id: string;
  device_id: string;
  date: string; // YYYY-MM-DD format
  duration: number; // in minutes
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  deep_sleep: number; // in minutes
  light_sleep: number; // in minutes
  rem_sleep: number; // in minutes
  awake_time: number; // in minutes
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  created_at?: string;
}

const SLEEP_TABLE = 'sleep_records';

// Save sleep record
export const saveSleepRecord = async (userId: string, deviceId: string, sleepData: Omit<SleepRecord, 'id' | 'created_at' | 'user_id' | 'device_id'>): Promise<SleepRecord | null> => {
  try {
    if (!userId || !deviceId) {
      throw new Error('User ID and device ID are required');
    }

    const record: Omit<SleepRecord, 'id' | 'created_at'> = {
      user_id: userId,
      device_id: deviceId,
      ...sleepData,
    };

    const { data, error } = await supabase
      .from(SLEEP_TABLE)
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving sleep record:', error);
    throw error;
  }
};

// Get sleep records for a user
export const getUserSleepRecords = async (userId: string, days = 30): Promise<SleepRecord[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from(SLEEP_TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sleep records:', error);
    throw error;
  }
};

// Get sleep summary for a user
export const getSleepSummary = async (userId: string, days = 7): Promise<any> => {
  try {
    const records = await getUserSleepRecords(userId, days);

    if (records.length === 0) {
      return {
        averageDuration: 0,
        averageQuality: 'N/A',
        totalNights: 0,
        averageDeepSleep: 0,
        averageLightSleep: 0,
        averageRemSleep: 0,
      };
    }

    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const totalDeepSleep = records.reduce((sum, r) => sum + r.deep_sleep, 0);
    const totalLightSleep = records.reduce((sum, r) => sum + r.light_sleep, 0);
    const totalRemSleep = records.reduce((sum, r) => sum + r.rem_sleep, 0);

    // Calculate quality score
    const qualityScores: { [key: string]: number } = {
      poor: 1,
      fair: 2,
      good: 3,
      excellent: 4,
    };
    const avgQualityScore = records.reduce((sum, r) => sum + (qualityScores[r.quality] || 0), 0) / records.length;
    const qualityMap: { [key: number]: string } = {
      1: 'poor',
      2: 'fair',
      3: 'good',
      4: 'excellent',
    };
    const averageQuality = qualityMap[Math.round(avgQualityScore)] || 'N/A';

    return {
      averageDuration: Math.round(totalDuration / records.length),
      averageQuality,
      totalNights: records.length,
      averageDeepSleep: Math.round(totalDeepSleep / records.length),
      averageLightSleep: Math.round(totalLightSleep / records.length),
      averageRemSleep: Math.round(totalRemSleep / records.length),
      records,
    };
  } catch (error) {
    console.error('Error fetching sleep summary:', error);
    throw error;
  }
};

// Get today's sleep record
export const getTodaySleepRecord = async (userId: string): Promise<SleepRecord | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from(SLEEP_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return data || null;
  } catch (error) {
    console.error('Error fetching today sleep record:', error);
    throw error;
  }
};
