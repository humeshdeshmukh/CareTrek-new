import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

type ContactType = 'family' | 'police' | 'medical' | 'other';

export interface SOSContact {
  id: string;
  name: string;
  phone: string;
  type: ContactType;
  is_emergency: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useSOSContacts = (userId: string | undefined) => {
  const [contacts, setContacts] = useState<SOSContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all contacts
  const fetchContacts = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sos_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('is_emergency', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  // Add or update a contact
  const saveContact = async (contact: Omit<SOSContact, 'id' | 'created_at' | 'updated_at'>, id?: string) => {
    if (!userId) {
      console.error('Cannot save contact: userId is undefined');
      throw new Error('User not authenticated');
    }

    try {
      const contactData = { ...contact, user_id: userId };
      console.log('Attempting to save contact:', contactData);

      if (id) {
        // Update existing contact
        console.log('Updating contact ID:', id);
        const { data, error } = await supabase
          .from('sos_contacts')
          .update(contactData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
        console.log('Contact updated successfully:', data);
        return data;
      } else {
        // Add new contact
        console.log('Inserting new contact');
        const { data, error } = await supabase
          .from('sos_contacts')
          .insert([contactData])
          .select()
          .single();

        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }
        console.log('Contact inserted successfully:', data);
        return data;
      }
    } catch (err: any) {
      console.error('Error saving contact:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      throw err;
    }
  };

  // Delete a contact
  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sos_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting contact:', err);
      throw err;
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    fetchContacts();

    const subscription = supabase
      .channel('sos_contacts_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sos_contacts',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          fetchContacts(); // Refresh on any changes
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return {
    contacts,
    loading,
    error,
    saveContact,
    deleteContact,
    refreshContacts: fetchContacts
  };
};
