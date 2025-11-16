import { supabase } from '../lib/supabase';

export const deleteUserAccount = async (): Promise<{ data?: any; error?: Error }> => {
  try {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      method: 'POST',
    });

    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Error deleting user account:', error);
    return { error: error as Error };
  }
};
