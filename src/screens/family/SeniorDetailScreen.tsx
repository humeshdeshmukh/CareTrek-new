import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Switch,
  ImageSourcePropType,
  Linking,
  Platform,
  Alert,
  FlatList,
  RefreshControl,
  TextInput
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../../contexts/translation/TranslationContext';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useCachedTranslation } from '../../hooks/useCachedTranslation';
import { supabase } from '../../lib/supabase';
import { useSeniorData } from '../../contexts/SeniorDataContext';
import { useAuth } from '../../hooks/useAuth';

// Default avatar component
const DefaultAvatar = ({ size = 80 }: { size?: number }) => (
  <View style={[styles.defaultAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Ionicons name="person" size={size * 0.6} color="#94A3B8" />
  </View>
);

// Theme colors
const colors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  primary: '#4F46E5',
  notification: '#DC2626',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
};

// Define the navigation parameters for the screens we'll be navigating to
type RootStackParamList = {
  SeniorDetail: { seniorId: string };
  TrackSenior: { seniorId: string };
  Messages: { seniorId: string; seniorName?: string; seniorAvatar?: string; status?: string };
  HealthMonitoring: { seniorId: string; seniorName?: string; seniorAvatar?: string; status?: string };
  MedicationMonitoring: { seniorId: string; seniorName?: string; seniorAvatar?: string; status?: string };
  ReminderMonitoring: { seniorId: string; seniorName?: string; seniorAvatar?: string; status?: string };
  AppointmentMonitoring: { seniorId: string; seniorName?: string; seniorAvatar?: string; status?: string };
  LocationMonitoring: { seniorId: string; seniorName?: string; seniorAvatar?: string; status?: string };
  Settings: undefined;
  // Add other screens as needed
  [key: string]: any;
};

type NavigationProp = StackNavigationProp<RootStackParamList> & {
  navigate: <T extends keyof RootStackParamList>(
    screen: T,
    params: RootStackParamList[T]
  ) => void;
};

type SeniorLocal = {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'alert';
  lastActive: string;
  avatar?: string;
  heartRate?: number;
  oxygen?: number;
  steps?: number;
  battery?: number;
  location: string;
  relationship?: string;
  email?: string;
  phone?: string;
};

type SeniorDetailRouteProp = RouteProp<RootStackParamList, 'SeniorDetail'>;

// Navigation options configuration with improved icons and organization
// Navigation options configuration with improved icons and organization
const NAVIGATION_OPTIONS = [
  {
    id: 'health',
    title: 'Health',
    icon: 'favorite-outline' as const,
    iconSet: 'MaterialIcons' as const,
    color: '#EF4444',
    screen: 'HealthMonitoring' as const,
    params: (seniorId: string) => ({ seniorId })
  },
  {
    id: 'medication',
    title: 'Medication',
    icon: 'medical-bag' as const,
    iconSet: 'MaterialCommunityIcons' as const,
    color: '#3B82F6',
    screen: 'MedicationMonitoring' as const,
    params: (seniorId: string) => ({ seniorId })
  },
  {
    id: 'reminders',
    title: 'Reminders',
    icon: 'notifications-none' as const,
    iconSet: 'MaterialIcons' as const,
    color: '#F59E0B',
    screen: 'ReminderMonitoring' as const,
    params: (seniorId: string) => ({ seniorId })
  },
  {
    id: 'appointments',
    title: 'Appointments',
    icon: 'calendar-month' as const,
    iconSet: 'MaterialIcons' as const,
    color: '#8B5CF6',
    screen: 'AppointmentMonitoring' as const,
    params: (seniorId: string) => ({ seniorId })
  },
  {
    id: 'location',
    title: 'Location',
    icon: 'location-on' as const,
    iconSet: 'MaterialIcons' as const,
    color: '#10B981',
    screen: 'LocationMonitoring' as const,
    params: (seniorId: string) => ({ seniorId })
  }
];

type SeniorDataItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  isEditable: boolean;
};

const SeniorDetailScreen: React.FC = () => {
  // Navigation and theme hooks
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<{ params: { seniorId: string } }>>();
  const { isDark } = useTheme();
  const { currentLanguage } = useTranslation();
  const { user } = useAuth();

  // Translations
  const { translatedText: loadingText } = useCachedTranslation('Loading senior...', currentLanguage);
  const { translatedText: retryText } = useCachedTranslation('Retry', currentLanguage);
  const { translatedText: errorText } = useCachedTranslation('Unable to load senior', currentLanguage);
  const { translatedText: addNoteText } = useCachedTranslation('Add Note', currentLanguage);
  const { translatedText: saveText } = useCachedTranslation('Save', currentLanguage);
  const { translatedText: cancelText } = useCachedTranslation('Cancel', currentLanguage);

  // Get seniorId from route params with a default value
  const seniorId = route.params?.seniorId || 'default-senior-id';

  // State hooks
  const [senior, setSenior] = useState<SeniorLocal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRelationship, setEditRelationship] = useState('');

  // Use the senior data context
  const {
    seniorData,
    loading: dataLoading,
    error: dataError,
    saveData,
    deleteData,
    refreshData
  } = useSeniorData();

  // Format the notes data for display
  const notes = useMemo(() => {
    if (!seniorData) return [];
    return seniorData.map(item => ({
      id: item.id,
      title: item.data.title || 'Note',
      description: item.data.description,
      createdAt: new Date(item.created_at).toLocaleDateString(),
      createdBy: item.family_member_id === user?.id ? 'You' : 'Senior',
      isEditable: item.family_member_id === user?.id
    }));
  }, [seniorData, user?.id]);

  // Handle adding a new note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const noteData = {
        title: 'Note',
        description: newNote,
        type: 'note',
        createdAt: new Date().toISOString()
      };

      await saveData(seniorId, noteData);
      setNewNote('');
      setIsAddingNote(false);
      refreshData();
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a note
  const handleDeleteNote = async (id: string) => {
    try {
      await deleteData(id);
      refreshData();
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    }
  };

  // Handle opening edit profile modal
  const handleOpenEditProfile = () => {
    if (!senior) return;
    setEditName(senior.name);
    setEditPhone(senior.phone || '');
    setEditEmail(senior.email || '');
    setEditRelationship(senior.relationship || '');
    setIsEditingProfile(true);
  };

  // Handle updating senior profile
  const handleUpdateProfile = async () => {
    if (!senior) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update 'seniors' table
      const { error: seniorError } = await supabase
        .from('seniors')
        .update({
          name: editName,
          phone: editPhone,
          email: editEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', senior.id);

      if (seniorError) {
        // If update fails, it might be because the record doesn't exist (e.g. registered user only)
        // In that case we might need to create it or handle it differently.
        // For now, let's assume if they are in the list, they have a record or we created one.
        console.error('Error updating senior record:', seniorError);
        throw new Error('Failed to update senior details');
      }

      // 2. Update relationship in 'family_connections'
      if (editRelationship !== senior.relationship) {
        const { error: connError } = await supabase
          .from('family_connections')
          .update({
            connection_name: editRelationship,
            updated_at: new Date().toISOString()
          })
          .eq('senior_user_id', senior.id)
          .eq('family_user_id', user?.id);

        if (connError) {
          console.error('Error updating relationship:', connError);
        }
      }

      // Refresh data
      await fetchSeniorDetails();
      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile updated successfully');

    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render a single note item
  const renderNoteItem = ({ item }: { item: SeniorDataItem }) => (
    <View style={[styles.noteCard, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
      <View style={styles.noteHeader}>
        <Text style={[styles.noteTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
          {item.title}
        </Text>
        {item.isEditable && (
          <TouchableOpacity onPress={() => handleDeleteNote(item.id)}>
            <Ionicons name="trash-outline" size={20} color={isDark ? '#E53E3E' : '#E53E3E'} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.noteText, { color: isDark ? '#A0AEC0' : '#4A5568' }]}>
        {item.description}
      </Text>
      <View style={styles.noteFooter}>
        <Text style={[styles.noteMeta, { color: isDark ? '#718096' : '#A0AEC0' }]}>
          {item.createdBy} • {item.createdAt}
        </Text>
      </View>
    </View>
  );

  // Status color function with theme support
  const getStatusColor = (status: SeniorLocal['status']) => {
    if (status === 'online') return '#48BB78'; // Green for online
    if (status === 'alert') return '#F56565'; // Red for alert
    return '#A0AEC0'; // Gray for offline
  };

  // fetch senior details from Supabase
  const fetchSeniorDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Try to fetch from 'seniors' table first (managed seniors)
      const { data: seniorData, error: seniorError } = await supabase
        .from('seniors')
        .select('*')
        .eq('id', seniorId)
        .maybeSingle();

      if (seniorError) {
        console.warn('Error fetching senior details from seniors table:', seniorError);
      }

      // 2. Also fetch from 'profiles' table (registered users)
      // Note: In some cases seniorId might be the user_id, so we check both
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', seniorId)
        .maybeSingle();

      if (profileError) {
        console.warn('Error fetching profile data:', profileError);
      }

      // If neither exists, we can't show this senior properly
      if (!seniorData && !profileData) {
        throw new Error('Senior not found');
      }

      // Combine profile and senior data, prioritizing 'seniors' table
      const seniorProfile: SeniorLocal = {
        id: seniorId,
        name: seniorData?.name || profileData?.display_name || 'Senior',
        status: 'online', // You might want to implement actual status checking
        lastActive: new Date().toISOString(),
        location: seniorData?.address || 'Location not set',
        avatar: profileData?.avatar_url || '', // Avatar usually comes from user profile
        relationship: seniorData?.relationship || 'Senior', // This might need to come from family_connections
        email: seniorData?.email || profileData?.email || '',
        phone: seniorData?.phone || profileData?.phone || 'Phone not set'
      };

      // Fetch relationship from family_connections if needed
      if (!seniorProfile.relationship || seniorProfile.relationship === 'Senior') {
        const { data: connectionData } = await supabase
          .from('family_connections')
          .select('connection_name')
          .eq('senior_user_id', seniorId)
          .eq('family_user_id', user?.id)
          .maybeSingle();

        if (connectionData?.connection_name) {
          seniorProfile.relationship = connectionData.connection_name;
        }
      }

      setSenior(seniorProfile);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching senior details:', err);
      setError('Failed to load senior details');
      setLoading(false);

      // Set a default senior if there's an error
      setSenior({
        id: seniorId,
        name: 'Senior',
        status: 'offline',
        lastActive: new Date().toISOString(),
        location: 'Location not available',
        avatar: '',
        relationship: 'Senior',
        email: '',
        phone: 'Phone not available'
      });
    }
  }, [seniorId, user?.id]);

  // Load senior data on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchSeniorDetails();
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchSeniorDetails]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchSeniorDetails();
      }
    };

    loadData();

    // Set up a simple interval to simulate real-time updates
    const intervalId = setInterval(() => {
      if (isMounted) {
        setSenior(prev => ({
          ...prev!,
          lastActive: new Date().toISOString(),
        }));
      }
    }, 60000); // Update every minute

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [fetchSeniorDetails, isConnected]);

  const toggleConnection = useCallback(async () => {
    if (!senior) return;

    const newStatus = !isConnected;
    // Use 'accepted'/'rejected' to match the database constraint
    const statusValue = newStatus ? 'accepted' : 'rejected';

    console.log('Toggling connection status:', {
      seniorId,
      newStatus,
      statusValue,
      currentIsConnected: isConnected
    });

    try {
      // First, check the current connection status
      const { data: currentConnection, error: fetchError } = await supabase
        .from('family_connections')
        .select('*')
        .eq('senior_user_id', seniorId)
        .single();

      console.log('Current connection data:', currentConnection);

      if (fetchError && !fetchError.message.includes('No rows found')) {
        console.error('Error fetching current connection:', fetchError);
        throw fetchError;
      }

      // If no connection exists yet, create one
      if (!currentConnection) {
        console.log('No existing connection found, creating new one');
        const { error: insertError } = await supabase
          .from('family_connections')
          .insert({
            senior_user_id: seniorId,
            family_user_id: user?.id,
            status: statusValue,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      } else {
        // Update existing connection
        console.log('Updating status to:', statusValue);
        const { error: updateError } = await supabase
          .from('family_connections')
          .update({
            status: statusValue,
            updated_at: new Date().toISOString()
          })
          .eq('senior_user_id', seniorId);

        if (updateError) throw updateError;
      }

      // Update local state
      setIsConnected(newStatus);

      setSenior(prev => prev ? {
        ...prev,
        status: newStatus ? 'online' : 'offline',
        lastActive: new Date().toISOString()
      } : null);

      console.log(`Successfully ${newStatus ? 'connected to' : 'disconnected from'} senior:`, senior.name);

    } catch (err) {
      console.error('Error updating connection status:', err);
      // Revert the toggle if there's an error
      setIsConnected(!newStatus);
    }
  }, [senior, isConnected, seniorId]);

  // Render loading state with better visual feedback
  const renderLoading = () => (
    <View style={[styles.centered, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
        <ActivityIndicator size="large" color={isDark ? '#48BB78' : '#2F8550'} />
        <Text style={[styles.loadingText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
          {loadingText}
        </Text>
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={isDark ? '#48BB78' : '#2F855A'} />
          <Text style={[styles.muted, { marginTop: 12, color: isDark ? '#94A3B8' : '#64748B' }]}>
            {loadingText}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!senior) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
        <View style={styles.centered}>
          <Ionicons
            name="warning"
            size={48}
            color={isDark ? '#F56565' : '#DC2626'}
          />
          <Text style={[styles.muted, { marginTop: 16, color: isDark ? '#E2E8F0' : '#4A5568' }]}>
            No senior data available
          </Text>
          <TouchableOpacity
            style={[styles.button, {
              backgroundColor: isDark ? '#48BB78' : '#2F855A',
              marginTop: 16,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8
            }]}
            onPress={fetchSeniorDetails}
          >
            <Text style={[styles.buttonText, { color: 'white' }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
        <View style={styles.centered}>
          <Ionicons
            name="warning"
            size={56}
            color={isDark ? '#F56565' : '#DC2626'}
          />
          <Text style={[styles.errorText, { color: isDark ? '#F56565' : '#DC2626', marginTop: 12 }]}>
            {errorText}
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, {
              backgroundColor: isDark ? '#48BB78' : '#2F855A',
              marginTop: 24
            }]}
            onPress={fetchSeniorDetails}
          >
            <Text style={[styles.buttonText, { color: 'white' }]}>
              {retryText}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Navigation options with proper typing
  const navigationOptions = NAVIGATION_OPTIONS.map(option => {
    const baseParams = option.params(senior.id);
    const params = {
      ...baseParams,
      seniorName: senior.name,
      seniorAvatar: senior.avatar,
      status: senior.status
    };

    return {
      ...option,
      onPress: () => {
        // Type assertion to handle the navigation params
        (navigation as any).navigate(option.screen, params);
      }
    };
  });

  // Render icon based on iconSet with proper typing
  const renderIcon = (icon: string, iconSet?: string, size = 24, color = '#4B5563') => {
    const iconSize = size as number;
    const iconColor = color as string;

    switch (iconSet) {
      case 'MaterialIcons':
        return <MaterialIcons name={icon as any} size={iconSize} color={iconColor} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={icon as any} size={iconSize} color={iconColor} />;
      case 'FontAwesome5':
        return <FontAwesome5 name={icon as any} size={iconSize} color={iconColor} />;
      default:
        return <Ionicons name="help-circle-outline" size={iconSize} color={iconColor} />;
    }
  };

  // ... rest of the code remains the same ...
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dataLoading}
            onRefresh={refreshData}
            colors={[isDark ? '#48BB78' : '#2F855A']}
            tintColor={isDark ? '#48BB78' : '#2F855A'}
          />
        }
      >

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {senior.avatar ? (
                <Image
                  source={{ uri: senior.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <DefaultAvatar size={80} />
              )}
              <View
                style={[styles.statusBadge, {
                  backgroundColor: getStatusColor(senior.status),
                  borderColor: isDark ? '#1E293B' : '#FFFFFF'
                }]}
              />
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameContainer}>
                <Text style={[styles.seniorName, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                  {senior.name}
                </Text>
                <TouchableOpacity onPress={handleOpenEditProfile} style={{ marginLeft: 8 }}>
                  <Ionicons name="pencil" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>
              <View style={[styles.relationshipBadge, { backgroundColor: isDark ? '#334155' : '#F1F5F9', alignSelf: 'flex-start', marginTop: 4 }]}>
                <Text style={[styles.relationship, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {senior.relationship}
                </Text>
              </View>

              <View style={styles.connectionStatus}>
                <View
                  style={[styles.statusDot, {
                    backgroundColor: getStatusColor(senior.status)
                  }]}
                />
                <Text style={[styles.statusText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {senior.status.charAt(0).toUpperCase() + senior.status.slice(1)}
                </Text>
              </View>

              <View style={styles.connectionSwitch}>
                <Text style={[styles.connectionText, { color: isDark ? '#E2E8F0' : '#4B5563' }]}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
                <Switch
                  value={isConnected}
                  onValueChange={toggleConnection}
                  trackColor={{ false: '#E2E8F0', true: isDark ? '#48BB78' : '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.contactInfo}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="call-outline"
                size={20}
                color={isDark ? '#94A3B8' : '#64748B'}
              />
              <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#4B5563' }]}>
                Contact
              </Text>
            </View>

            <View style={[styles.contactGrid, { justifyContent: 'flex-start' }]}>
              <TouchableOpacity
                style={[styles.contactItem, {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  width: '100%', // Make it full width
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 12
                }]}
                onPress={() => {
                  if (senior.phone) {
                    Linking.openURL(`tel:${senior.phone}`);
                  }
                }}
                disabled={!senior.phone}
              >
                <View style={[{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                  backgroundColor: isDark ? '#0F172A' : '#EFF6FF'
                }]}>
                  <Ionicons
                    name="call"
                    size={20}
                    color={isDark ? '#60A5FA' : '#3B82F6'}
                  />
                </View>
                <View style={{
                  flex: 1,
                  marginLeft: 8
                }}>
                  <Text style={[{
                    fontSize: 14,
                    marginBottom: 2,
                    color: isDark ? '#94A3B8' : '#64748B'
                  }]}>
                    Phone
                  </Text>
                  <Text style={[{
                    fontSize: 16,
                    fontWeight: '500',
                    color: isDark ? '#F8FAFC' : '#1E293B'
                  }]}>
                    {senior.phone || 'Not provided'}
                  </Text>
                </View>
                {senior.phone && (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isDark ? '#4B5563' : '#9CA3AF'}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#4B5563', marginBottom: 12 }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {navigationOptions.slice(0, 4).map((option) => {
              const renderNavigationIcon = (opt: typeof NAVIGATION_OPTIONS[0]) => {
                const { icon, color, iconSet } = opt;

                const iconProps = {
                  name: icon as any,
                  size: 24 as number,
                  color: color as string
                };

                return (
                  <View key={`icon-${opt.id}`} style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
                    {iconSet === 'MaterialIcons' ? (
                      <MaterialIcons {...iconProps} />
                    ) : iconSet === 'MaterialCommunityIcons' ? (
                      <MaterialCommunityIcons {...iconProps} />
                    ) : iconSet === 'FontAwesome5' ? (
                      <FontAwesome5 {...iconProps} />
                    ) : (
                      <Ionicons {...iconProps} />
                    )}
                  </View>
                );
              };

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.quickAction, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  onPress={option.onPress}
                  activeOpacity={0.8}
                >
                  {renderNavigationIcon(option)}
                  <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#4B5563' }]}>
                    {option.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Last Seen */}
        <View style={[styles.lastSeenContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Ionicons
            name="time-outline"
            size={16}
            color={isDark ? '#94A3B8' : '#64748B'}
          />
          <Text style={[styles.lastSeenText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Last active: {formatLastSeen(senior.lastActive)}
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      {
        isEditingProfile && (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                Edit Profile
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Name</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#1E293B',
                    borderColor: isDark ? '#334155' : '#E2E8F0'
                  }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Senior Name"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Relationship</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#1E293B',
                    borderColor: isDark ? '#334155' : '#E2E8F0'
                  }]}
                  value={editRelationship}
                  onChangeText={setEditRelationship}
                  placeholder="e.g. Father, Mother"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Phone</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#1E293B',
                    borderColor: isDark ? '#334155' : '#E2E8F0'
                  }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="Phone Number"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Email</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#1E293B',
                    borderColor: isDark ? '#334155' : '#E2E8F0'
                  }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Email Address"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                  onPress={() => setIsEditingProfile(false)}
                >
                  <Text style={[styles.modalButtonText, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: isDark ? '#48BB78' : '#2F855A' }]}
                  onPress={handleUpdateProfile}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )
      }
    </SafeAreaView >
  );
};

// Helper function to format last seen time
const formatLastSeen = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    return `${diffInMinutes} min ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  muted: {
    color: '#64748B',
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: '#DC2626',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Header
  header: {
    padding: 16,
    textAlign: 'center',
    marginRight: 8,
  },

  // Profile Card
  profileCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  defaultAvatar: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  profileInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  seniorName: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
    marginBottom: 4,
  },
  relationshipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  relationship: {
    fontSize: 12,
    fontWeight: '500',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  connectionSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Contact Information
  contactInfo: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 0,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Quick Actions
  quickActions: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 8,
  },
  quickAction: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // More Options
  moreOptions: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  // Last Seen
  lastSeenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 8,
  },
  lastSeenText: {
    fontSize: 13,
    marginLeft: 8,
    fontFamily: 'Inter_500Medium',
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  addButton: {
    padding: 8,
  },
  addNoteContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesList: {
    gap: 12,
  },
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteMeta: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    marginTop: 12,
    textAlign: 'center',
  },
});

export default SeniorDetailScreen;
