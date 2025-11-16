import { supabase } from '../lib/supabase';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  time: string; // 'HH:MM AM/PM'
  type: 'medication' | 'activity';
  enabled: boolean;
  notification_id?: string | null;
  created_at?: string;
  updated_at?: string;
  date?: string | null; // Made optional and nullable
}

export const reminderService = {
  // Get all reminders for the current user
  async getReminders(): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching reminders:', error);
      throw error;
    }

    return data || [];
  },

  // Create a new reminder
  async createReminder(reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'date'>): Promise<Reminder> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Remove date field if it exists since we calculate it from time
    const { date, ...reminderWithoutDate } = reminder as any;
    
    const { data, error } = await supabase
      .from('reminders')
      .insert([
        {
          ...reminderWithoutDate,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }

    return data;
  },

  // Update an existing reminder
  async updateReminder(
    id: string,
    updates: Partial<Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'date'>>
  ): Promise<Reminder> {
    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }

    return data;
  },

  // Delete a reminder
  async deleteReminder(id: string): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  },

  // Toggle reminder enabled/disabled
  async toggleReminder(id: string, enabled: boolean): Promise<Reminder> {
    return this.updateReminder(id, { enabled });
  },

  // Update notification ID for a reminder
  async updateNotificationId(id: string, notificationId: string | null): Promise<Reminder> {
    return this.updateReminder(id, { notification_id: notificationId });
  },
};
