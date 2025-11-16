import { supabase } from '../lib/supabase';

// Generate a random family key
export const generateFamilyKey = (): string => {
  // Generate a random 8-character alphanumeric key
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Save family key to the database
export const saveFamilyKey = async (userId: string, key: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert(
        { 
          user_id: userId, 
          family_key: key,
          updated_at: new Date().toISOString() 
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
  } catch (error) {
    console.error('Error saving family key:', error);
    throw error;
  }
};

// Get family key for a user
export const getFamilyKey = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('family_key')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data?.family_key || null;
  } catch (error) {
    console.error('Error getting family key:', error);
    return null;
  }
};

// Get user ID by family key
export const getUserIdByFamilyKey = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('family_key', key)
      .single();

    if (error) throw error;
    return data?.user_id || null;
  } catch (error) {
    console.error('Error getting user by family key:', error);
    return null;
  }
};

// Add family member relationship
export const addFamilyMember = async (userId: string, familyKey: string): Promise<void> => {
  try {
    const seniorUserId = await getUserIdByFamilyKey(familyKey);
    if (!seniorUserId) {
      throw new Error('Invalid family key');
    }

    const { error } = await supabase
      .from('family_relationships')
      .insert({
        senior_user_id: seniorUserId,
        family_member_id: userId,
        created_at: new Date().toISOString(),
        status: 'active'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error adding family member:', error);
    throw error;
  }
};

// Get all family members for a senior
export const getFamilyMembers = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('family_relationships')
      .select(`
        family_member_id,
        user_profiles:family_member_id (
          id,
          email,
          full_name,
          avatar_url,
          created_at
        )
      `)
      .eq('senior_user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return data.map(item => item.user_profiles);
  } catch (error) {
    console.error('Error getting family members:', error);
    return [];
  }
};
