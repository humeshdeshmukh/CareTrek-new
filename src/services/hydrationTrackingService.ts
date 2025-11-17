// src/services/hydrationTrackingService.ts
import { supabase } from '../lib/supabase';

export interface HydrationRecord {
  id?: string;
  user_id: string;
  date: string; // YYYY-MM-DD format
  water_intake: number; // in ml
  goal: number; // daily goal in ml
  entries: HydrationEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface HydrationEntry {
  id?: string;
  hydration_record_id?: string;
  amount: number; // in ml
  time: string; // HH:MM format
  type: 'water' | 'juice' | 'tea' | 'coffee' | 'milk' | 'other'; // type of beverage
  created_at?: string;
}

const HYDRATION_TABLE = 'hydration_records';
const HYDRATION_ENTRIES_TABLE = 'hydration_entries';

// Save or update hydration record
export const saveHydrationRecord = async (userId: string, waterIntake: number, goal: number = 2000): Promise<HydrationRecord | null> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if record exists for today
    const { data: existingRecord } = await supabase
      .from(HYDRATION_TABLE)
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    let result;

    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabase
        .from(HYDRATION_TABLE)
        .update({
          water_intake: waterIntake,
          goal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from(HYDRATION_TABLE)
        .insert({
          user_id: userId,
          date: today,
          water_intake: waterIntake,
          goal,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return result;
  } catch (error) {
    console.error('Error saving hydration record:', error);
    throw error;
  }
};

// Add hydration entry
export const addHydrationEntry = async (userId: string, amount: number, type: HydrationEntry['type'] = 'water'): Promise<HydrationEntry | null> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Get or create today's hydration record
    let hydrationRecord = await getTodayHydrationRecord(userId);

    if (!hydrationRecord) {
      hydrationRecord = await saveHydrationRecord(userId, amount);
    } else {
      // Update water intake
      await saveHydrationRecord(userId, hydrationRecord.water_intake + amount, hydrationRecord.goal);
    }

    // Add entry
    const { data, error } = await supabase
      .from(HYDRATION_ENTRIES_TABLE)
      .insert({
        hydration_record_id: hydrationRecord?.id,
        amount,
        time,
        type,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding hydration entry:', error);
    throw error;
  }
};

// Get today's hydration record
export const getTodayHydrationRecord = async (userId: string): Promise<HydrationRecord | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from(HYDRATION_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return data || null;
  } catch (error) {
    console.error('Error fetching today hydration record:', error);
    throw error;
  }
};

// Get hydration records for a user
export const getUserHydrationRecords = async (userId: string, days = 30): Promise<HydrationRecord[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from(HYDRATION_TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching hydration records:', error);
    throw error;
  }
};

// Get hydration summary
export const getHydrationSummary = async (userId: string, days = 7): Promise<any> => {
  try {
    const records = await getUserHydrationRecords(userId, days);

    if (records.length === 0) {
      return {
        averageIntake: 0,
        totalDays: 0,
        goalAchievementRate: 0,
        todayIntake: 0,
        todayGoal: 2000,
      };
    }

    const totalIntake = records.reduce((sum, r) => sum + r.water_intake, 0);
    const goalsAchieved = records.filter(r => r.water_intake >= r.goal).length;
    const todayRecord = records[0]; // Most recent is first

    return {
      averageIntake: Math.round(totalIntake / records.length),
      totalDays: records.length,
      goalAchievementRate: Math.round((goalsAchieved / records.length) * 100),
      todayIntake: todayRecord.water_intake,
      todayGoal: todayRecord.goal,
      records,
    };
  } catch (error) {
    console.error('Error fetching hydration summary:', error);
    throw error;
  }
};
