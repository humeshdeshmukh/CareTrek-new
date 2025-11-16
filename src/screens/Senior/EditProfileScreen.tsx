import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/auth/AuthContext';
import { useTheme } from '../../contexts/theme/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase';

// Extend the navigation prop type to include the EditProfile screen
type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'> & {
  navigate: (screen: 'Auth', params: { screen: 'EditProfile' }) => void;
  goBack: () => void;
};

const EditProfileScreen = ({ navigation }: { navigation: EditProfileScreenNavigationProp }) => {
  const { user, updateProfile } = useAuth();
  const { colors } = useTheme();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch the latest user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setDisplayName(data.display_name || '');
          setEmail(data.email || user.email || '');
          setPhoneNumber(data.phone || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleSave = async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Prepare updates for the profiles table
      const updates: any = {
        display_name: displayName.trim(),
        phone: phoneNumber.trim() || null,
        updated_at: new Date().toISOString()
      };
      
      // Only update email if it's different from the current one
      if (email && email !== user?.email) {
        // Note: Changing email requires re-authentication in Supabase
        // For now, we'll just update it in the profiles table
        updates.email = email.trim();
      }
      
      // Update the profile in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);
        
      if (profileError) throw profileError;
      
      // Update the auth user's display name
      if (displayName !== user?.displayName) {
        await updateProfile({ displayName: displayName.trim() });
      }
      
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[
        styles.container, 
        { 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: colors.background
        }
      ]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.text }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
            <Icon name="account" size={20} color={colors.primary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
            <Icon name="email" size={20} color={colors.primary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
            <Icon name="phone" size={20} color={colors.primary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter your phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={[styles.saveButtonText, { opacity: isSaving ? 0.7 : 1 }]}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
