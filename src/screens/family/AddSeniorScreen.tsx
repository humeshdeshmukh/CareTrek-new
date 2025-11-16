import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

type RootStackParamList = {
  HomeTab: { refresh?: boolean };
  Seniors: { refresh?: boolean };
  AddSenior: { onSuccess?: () => void };
  // Add other screens as needed
};

type SeniorProfile = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  medical_conditions?: string;
  medications?: string;
  allergies?: string;
  notes?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
};

const AddSeniorScreen = () => {
  const [seniorId, setSeniorId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'AddSenior'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddSenior'>>();
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const handleBack = () => {
    navigation.goBack();
  };

  const fetchSeniorProfile = async (id: string): Promise<SeniorProfile> => {
    try {
      console.log('Fetching senior profile for ID:', id);
      
      // First try to get from seniors table
      const { data: seniorData, error: seniorError } = await supabase
        .from('seniors')
        .select('*')
        .eq('id', id)
        .single();

      console.log('Senior data response:', { seniorData, seniorError });

      if (seniorError) {
        console.error('Error fetching senior profile:', {
          message: seniorError.message,
          details: seniorError.details,
          hint: seniorError.hint,
          code: seniorError.code
        });
        
        // Try to find the senior by email if the ID doesn't work
        console.log('Trying to find senior by email...');
        const { data: seniorByEmail, error: emailError } = await supabase
          .from('seniors')
          .select('*')
          .eq('email', id)
          .maybeSingle();
          
        console.log('Senior by email lookup:', { seniorByEmail, emailError });
        
        if (seniorByEmail) {
          console.log('Found senior by email, using ID:', seniorByEmail.id);
          // Use the found senior's ID
          id = seniorByEmail.id;
        } else {
          throw new Error('Senior not found by ID or email. Please check and try again.');
        }
      }

      if (!seniorData && !id) {
        throw new Error('Senior ID is required');
      }

      // Get the senior data again if we found by email
      const senior = seniorData || (await supabase
        .from('seniors')
        .select('*')
        .eq('id', id)
        .single()).data;

      if (!senior) {
        throw new Error('Senior not found. Please check the ID and try again.');
      }

      // Get additional profile info from user_profiles
      console.log('Fetching user profile for senior ID:', senior.user_id || senior.id);
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', senior.user_id || senior.id)
        .maybeSingle();

      console.log('User profile response:', { profileData, profileError });

      const profile = {
        id: senior.id,
        user_id: senior.user_id || senior.id,
        name: senior.name,
        email: senior.email,
        phone: senior.phone || profileData?.phone_number,
        avatar_url: profileData?.avatar_url,
        created_at: senior.created_at || new Date().toISOString(),
        updated_at: senior.updated_at || new Date().toISOString(),
      };
      
      console.log('Returning senior profile:', profile);
      return profile;
    } catch (error) {
      console.error('Error in fetchSeniorProfile:', error);
      throw error;
    }
  };

  const connectToSenior = async (profile: SeniorProfile, relationshipName: string) => {
    try {
      console.log('Connecting to senior with profile:', profile, 'and relationship:', relationshipName);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Authentication error:', userError);
        throw new Error('User not authenticated');
      }

      const seniorId = profile.user_id || profile.id;
      
      // 1. First, try to find the senior
      let senior = null;
      
      // Try by ID first
      const { data: seniorById, error: findError } = await supabase
        .from('seniors')
        .select('*')
        .eq('id', seniorId)
        .maybeSingle();

      // If not found by ID, try by email
      if (!seniorById) {
        console.log('Senior not found by ID, trying by email...');
        const { data: seniorByEmail } = await supabase
          .from('seniors')
          .select('*')
          .eq('email', profile.email)
          .maybeSingle();
          
        senior = seniorByEmail;
      } else {
        senior = seniorById;
      }

      // 2. If senior doesn't exist, create one
      if (!senior) {
        console.log('Creating new senior profile...');
        const newSenior = {
          id: seniorId,
          name: profile.name || `Senior ${seniorId.substring(0, 8)}`,
          email: profile.email || `senior-${Date.now()}@example.com`,
          phone: profile.phone || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: createError } = await supabase
          .from('seniors')
          .insert([newSenior]);

        if (createError) {
          console.error('Error creating senior:', createError);
          throw new Error(`Failed to create senior profile: ${createError.message}`);
        }
        
        senior = newSenior;
      }

      // 3. Create the relationship in family_relationships table
      console.log('Creating relationship in family_relationships...');
      const { error: relError } = await supabase
        .from('family_relationships')
        .upsert({
          senior_user_id: senior.id,
          family_member_id: user.id,
          status: 'accepted', // Using 'accepted' to match the database constraint
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'senior_user_id,family_member_id'
        });

      if (relError) {
        console.error('Error creating relationship in family_relationships:', relError);
        throw new Error(`Failed to create relationship: ${relError.message}`);
      }

      // 4. Create the connection in family_connections table
      console.log('Creating connection in family_connections...');
      const { error: connError } = await supabase
        .from('family_connections')
        .upsert({
          senior_user_id: senior.id,
          family_user_id: user.id,
          status: 'pending', // Using 'pending' to match the database constraint
          connection_name: relationshipName || 'Family Member',
          senior_name: senior.name,
          senior_email: senior.email,
          senior_phone: senior.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'senior_user_id,family_user_id'
        });

      if (connError) {
        console.error('Error creating connection in family_connections:', connError);
        throw new Error(`Failed to create connection: ${connError.message}`);
      }

      console.log('Successfully connected to senior:', senior);
      return senior;
      
    } catch (error) {
      console.error('Error in connectToSenior:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!seniorId.trim()) {
      Alert.alert(t('Error'), t('Please enter a valid senior ID or email'));
      return;
    }

    try {
      setIsLoading(true);
      
      // First try to fetch the profile
      let profile;
      try {
        profile = await fetchSeniorProfile(seniorId);
      } catch (fetchError) {
        console.log('Could not find existing senior, creating new one...');
        // If not found, create a minimal profile with the ID/email provided
        const isEmail = seniorId.includes('@');
        profile = {
          id: isEmail ? crypto.randomUUID() : seniorId,
          user_id: isEmail ? crypto.randomUUID() : seniorId,
          name: `Senior ${seniorId.substring(0, 8)}`,
          email: isEmail ? seniorId : `${seniorId}@example.com`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      
      // Connect to the senior (will create if doesn't exist)
      const connectedSenior = await connectToSenior(profile, relationship);
      
      // Show success message and navigate back
      Alert.alert(
        t('Success'), 
        `Successfully connected to ${connectedSenior.name || 'senior'}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Go back to the previous screen with a success flag
              if (navigation.canGoBack()) {
                navigation.goBack();
                // If there's a callback in route params, call it
                if (route.params?.onSuccess) {
                  route.params.onSuccess();
                }
              }
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      Alert.alert(
        t('Error'),
        error?.message || t('Failed to connect to senior. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={isDark ? '#E2E8F0' : '#1A202C'} 
              />
            </TouchableOpacity>
            <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              {t('Connect to Senior')}
            </Text>
            <View style={styles.headerRight} />
          </View>

          <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
            <Ionicons 
              name="person-circle-outline" 
              size={80} 
              color={isDark ? '#718096' : '#A0AEC0'} 
              style={styles.icon}
            />
            
            <Text style={[styles.instruction, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              {t('Enter the Senior\'s ID to connect')}
            </Text>
            
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: isDark ? '#2D3748' : '#F7FAFC',
                  color: isDark ? '#E2E8F0' : '#1A202C',
                  borderColor: isDark ? '#4A5568' : '#E2E8F0'
                }
              ]}
              placeholder={t('Senior ID or Email')}
              placeholderTextColor={isDark ? '#718096' : '#A0AEC0'}
              value={seniorId}
              onChangeText={setSeniorId}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
            />
            
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: isDark ? '#2D3748' : '#F7FAFC',
                  color: isDark ? '#E2E8F0' : '#1A202C',
                  borderColor: isDark ? '#4A5568' : '#E2E8F0',
                  marginTop: 16
                }
              ]}
              placeholder={t('Relationship (e.g., Mother, Father, Grandparent)')}
              placeholderTextColor={isDark ? '#718096' : '#A0AEC0'}
              value={relationship}
              onChangeText={setRelationship}
              autoCapitalize="words"
            />

            <TouchableOpacity 
              style={[
                styles.submitButton, 
                { 
                  backgroundColor: (seniorId && relationship) ? (isDark ? '#48BB78' : '#2F855A') : (isDark ? '#2D3748' : '#E2E8F0'),
                  opacity: (seniorId && relationship) ? 1 : 0.7
                }
              ]}
              onPress={handleSubmit}
              disabled={!seniorId || !relationship || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {t('Connect')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40, // Same as back button for balance
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginBottom: 16,
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    fontSize: 16,
  },
  submitButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddSeniorScreen;
