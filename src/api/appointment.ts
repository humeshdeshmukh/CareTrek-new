import { supabase } from '../lib/supabase';

export type Appointment = {
  id: string;
  title: string;
  doctor: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // 24-hour format (HH:MM)
  location: string | null;
  notes: string | null;
  reminder: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export const getAppointments = async (userId: string): Promise<{ data: Appointment[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { data: null, error: error as Error };
  }
};

export const addAppointment = async (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Appointment | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding appointment:', error);
    return { data: null, error: error as Error };
  }
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<{ data: Appointment | null; error: Error | null }> => {
  try {
    const { error: updateError } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { data: null, error: error as Error };
  }
};

export const deleteAppointment = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return { error: error as Error };
  }
};

export const toggleAppointmentReminder = async (id: string, currentReminder: boolean): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ reminder: !currentReminder })
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error toggling appointment reminder:', error);
    return { error: error as Error };
  }
};
