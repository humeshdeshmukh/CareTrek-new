import AsyncStorage from '@react-native-async-storage/async-storage';

const SENIORS_STORAGE_KEY = '@CareTrek:seniors';

export interface SeniorData {
  id: string;
  name: string;
  seniorId: string;
  status: 'online' | 'offline' | 'alert';
  lastActive: string;
  heartRate?: number;
  oxygen?: number;
  battery?: number;
  location?: string;
  avatar?: string;
}

export const saveSeniors = async (seniors: SeniorData[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(seniors);
    await AsyncStorage.setItem(SENIORS_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Error saving seniors:', e);
    throw e;
  }
};

export const getSeniors = async (): Promise<SeniorData[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(SENIORS_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error getting seniors:', e);
    return [];
  }
};

export const addSenior = async (senior: Omit<SeniorData, 'id'>): Promise<SeniorData> => {
  try {
    const seniors = await getSeniors();
    
    // Check if a senior with the same seniorId already exists
    const existingSeniorIndex = seniors.findIndex(s => s.seniorId === senior.seniorId);
    
    if (existingSeniorIndex >= 0) {
      // Update existing senior instead of adding a new one
      const updatedSenior: SeniorData = { 
        ...seniors[existingSeniorIndex],
        name: senior.name,
        seniorId: senior.seniorId,
        status: 'online', // Reset status to online when reconnecting
        lastActive: 'Just now',
        heartRate: senior.heartRate,
        oxygen: senior.oxygen,
        battery: senior.battery,
        location: senior.location,
        avatar: senior.avatar
      };
      
      const updatedSeniors = [...seniors];
      updatedSeniors[existingSeniorIndex] = updatedSenior;
      
      await saveSeniors(updatedSeniors);
      return updatedSenior;
    }
    
    // Add new senior if not exists
    const newSenior = {
      ...senior,
      id: Date.now().toString(),
    };
    
    const updatedSeniors = [...seniors, newSenior];
    await saveSeniors(updatedSeniors);
    return newSenior;
  } catch (e) {
    console.error('Error adding/updating senior:', e);
    throw e;
  }
};

export const updateSenior = async (id: string, updates: Partial<SeniorData>): Promise<SeniorData | null> => {
  try {
    const seniors = await getSeniors();
    const index = seniors.findIndex(senior => senior.id === id);
    
    if (index === -1) return null;
    
    const updatedSenior = { ...seniors[index], ...updates };
    const updatedSeniors = [...seniors];
    updatedSeniors[index] = updatedSenior;
    
    await saveSeniors(updatedSeniors);
    return updatedSenior;
  } catch (e) {
    console.error('Error updating senior:', e);
    throw e;
  }
};

export const removeSenior = async (id: string): Promise<boolean> => {
  try {
    const seniors = await getSeniors();
    const updatedSeniors = seniors.filter(senior => senior.id !== id);
    await saveSeniors(updatedSeniors);
    return true;
  } catch (e) {
    console.error('Error removing senior:', e);
    return false;
  }
};

export const clearAllSeniors = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SENIORS_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing all seniors:', e);
    throw e;
  }
};
