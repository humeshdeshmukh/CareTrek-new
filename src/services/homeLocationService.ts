import { supabase } from '../lib/supabase';

type HomeLocation = {
  id?: string;
  user_id: string;
  latitude: number;
  longitude: number;
  address: string;
  created_at?: string;
  updated_at?: string;
};

export const homeLocationService = {
  // Get home location for current user
  async getHomeLocation(userId: string): Promise<HomeLocation | null> {
    try {
      const { data, error } = await supabase
        .from('home_locations')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching home location:', error);
      return null;
    }
  },

  // Save or update home location
  async saveHomeLocation(location: Omit<HomeLocation, 'id' | 'created_at' | 'updated_at'>): Promise<HomeLocation | null> {
    try {
      const { data: existing } = await supabase
        .from('home_locations')
        .select('id')
        .eq('user_id', location.user_id)
        .single();

      let data, error;
      
      if (existing) {
        // Update existing
        const { data: updateData, error: updateError } = await supabase
          .from('home_locations')
          .update({
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        data = updateData;
        error = updateError;
      } else {
        // Create new
        const { data: insertData, error: insertError } = await supabase
          .from('home_locations')
          .insert([location])
          .select()
          .single();
        
        data = insertData;
        error = insertError;
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving home location:', error);
      return null;
    }
  },

  // Delete home location
  async deleteHomeLocation(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('home_locations')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting home location:', error);
      return false;
    }
  }
};
