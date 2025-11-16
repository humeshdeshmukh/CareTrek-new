import { supabase } from '../lib/supabase';

type SeniorData = {
  id?: string;
  senior_id: string;
  family_member_id: string;
  data: any; // Can be typed more specifically based on your data structure
  created_at?: string;
  updated_at?: string;
};

export const seniorDataService = {
  // Fetch all data for a senior (both created by senior and family members)
  async getSeniorData(seniorId: string, familyMemberId: string): Promise<SeniorData[]> {
    try {
      // Get data created by the senior
      const { data: seniorData, error: seniorError } = await supabase
        .from('senior_data')
        .select('*')
        .eq('senior_id', seniorId)
        .is('family_member_id', null);

      if (seniorError) throw seniorError;

      // Get data created by this family member for the senior
      const { data: familyData, error: familyError } = await supabase
        .from('senior_data')
        .select('*')
        .eq('senior_id', seniorId)
        .eq('family_member_id', familyMemberId);

      if (familyError) throw familyError;

      return [...(seniorData || []), ...(familyData || [])];
    } catch (error) {
      console.error('Error fetching senior data:', error);
      throw error;
    }
  },

  // Create or update senior data
  async saveSeniorData(
    seniorId: string, 
    familyMemberId: string, 
    data: any,
    dataId?: string
  ): Promise<SeniorData> {
    try {
      const timestamp = new Date().toISOString();
      
      if (dataId) {
        // Update existing data
        const { data: updatedData, error } = await supabase
          .from('senior_data')
          .update({
            data,
            updated_at: timestamp,
          })
          .eq('id', dataId)
          .select()
          .single();

        if (error) throw error;
        return updatedData;
      } else {
        // Create new data
        const { data: newData, error } = await supabase
          .from('senior_data')
          .insert([
            {
              senior_id: seniorId,
              family_member_id: familyMemberId,
              data,
              created_at: timestamp,
              updated_at: timestamp,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return newData;
      }
    } catch (error) {
      console.error('Error saving senior data:', error);
      throw error;
    }
  },

  // Delete senior data
  async deleteSeniorData(dataId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('senior_data')
        .delete()
        .eq('id', dataId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting senior data:', error);
      throw error;
    }
  },

  // Get data shared between a senior and a specific family member
  async getSharedData(seniorId: string, familyMemberId: string): Promise<SeniorData[]> {
    try {
      const { data, error } = await supabase
        .from('senior_data')
        .select('*')
        .or(`and(senior_id.eq.${seniorId},family_member_id.eq.${familyMemberId}),and(family_member_id.eq.${seniorId},senior_id.eq.${familyMemberId})`);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching shared data:', error);
      throw error;
    }
  },

  // Check if family member has access to senior's data
  async checkFamilyAccess(seniorId: string, familyMemberId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('family_connections')
        .select('status')
        .eq('senior_user_id', seniorId)
        .eq('family_user_id', familyMemberId)
        .single();

      if (error) throw error;
      return data?.status === 'accepted' || data?.status === 'active';
    } catch (error) {
      console.error('Error checking family access:', error);
      return false;
    }
  },
};
