import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  Image, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useTranslation } from '../../contexts/translation/TranslationContext';
import { useCachedTranslation } from '../../hooks/useCachedTranslation';
import { supabase } from '../../lib/supabase';

export type RootStackParamList = {
  SeniorDetail: { seniorId: string };
  ConnectSenior: undefined;
  AddSenior: { onSuccess?: () => void };
  Seniors: { refresh?: boolean };
  // Add other screens as needed
};

type Senior = {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'alert';
  lastActive: string;
  connectedAt: string; // Added connection time
  avatar_url?: string;
  heartRate?: number;
  oxygen?: number;
  steps?: number;
  email?: string;
  phone?: string;
  relationship?: string; // Added relationship field
};

type UserProfile = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
};

type SeniorData = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  user_profiles: UserProfile[];
};

type FamilyRelationship = {
  id: string;
  status: string;
  created_at: string;
  senior: SeniorData;
};

const SeniorsListScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Seniors'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Seniors'>>();
  const { isDark } = useTheme();
  const { currentLanguage } = useTranslation();
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Handle pull-to-refresh
  const onRefresh = React.useCallback(() => {
    fetchConnectedSeniors(true);
  }, []);

  // Handle screen focus and refresh parameter
  useFocusEffect(
    React.useCallback(() => {
      const refresh = route.params?.refresh || false;
      if (refresh || initialLoad) {
        fetchConnectedSeniors(true);
        setInitialLoad(false);
        // Clear the refresh param to prevent unnecessary refetches
        navigation.setParams({ refresh: false });
      }
      
      return () => {
        // Cleanup if needed
      };
    }, [route.params?.refresh, initialLoad])
  );

  // Translations
  const { translatedText: mySeniorsText } = useCachedTranslation('My Seniors', currentLanguage);
  const { translatedText: addSeniorText } = useCachedTranslation('Add Senior', currentLanguage);
  const { translatedText: onlineText } = useCachedTranslation('Online', currentLanguage);
  const { translatedText: offlineText } = useCachedTranslation('Offline', currentLanguage);
  const { translatedText: alertText } = useCachedTranslation('Needs Attention', currentLanguage);
  const { translatedText: lastSeenText } = useCachedTranslation('Last seen', currentLanguage);
  const { translatedText: noSeniorsText } = useCachedTranslation('No seniors connected yet', currentLanguage);
  const { translatedText: connectNowText } = useCachedTranslation('Connect now', currentLanguage);
  const { translatedText: deleteText } = useCachedTranslation('Delete', currentLanguage);
  const { translatedText: deleteSeniorText } = useCachedTranslation('Delete Connected Senior', currentLanguage);
  const { translatedText: deleteSeniorConfirmText } = useCachedTranslation('Are you sure you want to remove this senior from your connections?', currentLanguage);
  const { translatedText: cancelText } = useCachedTranslation('Cancel', currentLanguage);

  const fetchConnectedSeniors = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else if (!seniors.length) {
        setLoading(true);
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error(userError?.message || 'User not authenticated');
      }

      console.log('Fetching connected seniors for user:', user.id);

      // First, get all relationships for the current user
      const { data: relationships, error: relError } = await supabase
        .from('family_relationships')
        .select('senior_user_id, created_at, status')
        .eq('family_member_id', user.id);

      if (relError) throw relError;

      console.log('Found relationships:', relationships);

      if (!relationships || relationships.length === 0) {
        console.log('No relationships found');
        setSeniors([]);
        return;
      }

      // Get all senior user IDs
      const seniorUserIds = relationships.map(rel => rel.senior_user_id).filter(Boolean);
      
      if (seniorUserIds.length === 0) {
        console.log('No senior user IDs found');
        setSeniors([]);
        return;
      }

      // Get relationship names from family_connections
      const { data: connections, error: connError } = await supabase
        .from('family_connections')
        .select('senior_user_id, connection_name')
        .in('senior_user_id', seniorUserIds)
        .eq('family_user_id', user.id);

      if (connError) {
        console.error('Error fetching connections:', connError);
        throw connError;
      }

      // Create a map of senior_user_id to connection_name
      const connectionMap = new Map();
      connections?.forEach(conn => {
        connectionMap.set(conn.senior_user_id, conn.connection_name);
      });

      // Get basic user profiles (only fields that definitely exist)
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', seniorUserIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        throw profilesError;
      }

      console.log('Fetched user profiles:', userProfiles);

      // Transform the data
      const connectedSeniors = relationships
        .map(rel => {
          const profile = userProfiles?.find(p => p.id === rel.senior_user_id);
          
          // Create a placeholder email using the user ID if needed
          const email = `${rel.senior_user_id}@caretrek.app`;
          
          const connectedAt = rel.created_at 
            ? new Date(rel.created_at).toLocaleString() 
            : 'Unknown';
            
          return {
            id: rel.senior_user_id,
            name: profile?.full_name || `Senior ${rel.senior_user_id.substring(0, 6)}`,
            status: (rel.status || 'offline') as 'online' | 'offline' | 'alert',
            lastActive: 'Recently', // You can update this with actual last active time if available
            connectedAt: connectedAt,
            avatar_url: profile?.avatar_url,
            email: email,
            phone: undefined, // Phone not available in the current schema
            relationship: connectionMap.get(rel.senior_user_id) || 'Family Member',
          } as Senior;
        })
        .filter(senior => senior !== null); // Filter out any null entries

      console.log('Transformed seniors:', connectedSeniors);
      setSeniors(connectedSeniors);
    } catch (error) {
      console.error('Error in fetchConnectedSeniors:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to load connected seniors. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchConnectedSeniors(!!route.params?.refresh);
      
      // Clear refresh param after handling
      if (route.params?.refresh) {
        navigation.setParams({ refresh: false });
      }
    }, [route.params?.refresh, navigation])
  );

  const handleDeleteSenior = (senior: Senior) => {
    Alert.alert(
      deleteSeniorText,
      deleteSeniorConfirmText,
      [
        {
          text: cancelText,
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: deleteText,
          onPress: async () => {
            try {
              // Get current user
              const { data: { user }, error: userError } = await supabase.auth.getUser();
              if (userError || !user) {
                throw new Error(userError?.message || 'User not authenticated');
              }

              // Delete the relationship from family_relationships table
              const { error: deleteError } = await supabase
                .from('family_relationships')
                .delete()
                .eq('family_member_id', user.id)
                .eq('senior_user_id', senior.id);

              if (deleteError) throw deleteError;

              // Refresh the list
              fetchConnectedSeniors(true);
              Alert.alert('Success', 'Senior removed from your connections');
            } catch (error) {
              console.error('Error deleting senior:', error);
              Alert.alert('Error', 'Failed to remove senior. Please try again.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderStatusBadge = (status: Senior['status']) => {
    const statusConfig = {
      online: { color: '#48BB78', text: onlineText },
      offline: { color: '#A0AEC0', text: offlineText },
      alert: { color: '#F56565', text: alertText },
    };

    const config = statusConfig[status] || statusConfig.offline;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    );
  };

  const renderSeniorItem = ({ item }: { item: Senior }) => (
    <TouchableOpacity 
      style={[styles.seniorCard, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
      onPress={() => navigation.navigate('SeniorDetail', { seniorId: item.id })}
    >
      {item.avatar_url ? (
        <Image 
          source={{ uri: item.avatar_url }} 
          style={styles.avatar}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="person" size={24} color="#718096" />
        </View>
      )}
      <View style={styles.seniorInfo}>
        <View style={styles.seniorHeader}>
          <View>
            <Text style={[styles.seniorName, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              {item.name}
            </Text>
            {item.relationship && (
              <Text style={[styles.relationshipText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                {item.relationship}
              </Text>
            )}
          </View>
          {renderStatusBadge(item.status)}
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
            {`${lastSeenText} ${item.lastActive}`}
          </Text>
          <Text style={[styles.infoText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
            {`Connected: ${item.connectedAt}`}
          </Text>
        </View>
        <View style={styles.metricsContainer}>
          {item.heartRate !== undefined && (
            <View style={styles.metricItem}>
              <Ionicons name="heart" size={16} color="#F56565" />
              <Text style={[styles.metricText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
                {item.heartRate} BPM
              </Text>
            </View>
          )}
          {item.oxygen !== undefined && (
            <View style={styles.metricItem}>
              <Ionicons name="pulse" size={16} color="#4299E1" />
              <Text style={[styles.metricText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
                {item.oxygen}% SpO₂
              </Text>
            </View>
          )}
          {item.steps !== undefined && (
            <View style={styles.metricItem}>
              <Ionicons name="walk" size={16} color="#48BB78" />
              <Text style={[styles.metricText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
                {item.steps.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('SeniorDetail', { seniorId: item.id })}
          style={styles.viewButton}
        >
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isDark ? '#718096' : '#A0AEC0'} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleDeleteSenior(item)}
          style={styles.deleteButton}
        >
          <Ionicons 
            name="trash" 
            size={20} 
            color="#E53E3E" 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
        <ActivityIndicator size="large" color={isDark ? '#48BB78' : '#2F855A'} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
          {mySeniorsText}
        </Text>
      </View>

      {seniors.length > 0 ? (
        <FlatList
          data={seniors}
          renderItem={renderSeniorItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[isDark ? '#48BB78' : '#2F855A']}
              tintColor={isDark ? '#48BB78' : '#2F855A'}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons 
            name="people" 
            size={64} 
            color={isDark ? '#4A5568' : '#A0AEC0'} 
          />
          <Text style={[styles.emptyStateText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
            {noSeniorsText}
          </Text>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: isDark ? '#2D3748' : '#E2E8F0' }]}
            onPress={() => navigation.navigate('AddSenior', { 
              onSuccess: () => fetchConnectedSeniors(true) 
            })}
          >
            <Ionicons 
              name="person-add" 
              size={20} 
              color={isDark ? '#48BB78' : '#2F855A'} 
              style={styles.addButtonIcon}
            />
            <Text style={[styles.addButtonText, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              {connectNowText}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {seniors.length > 0 && (
        <TouchableOpacity 
          style={[styles.floatingButton, { backgroundColor: isDark ? '#2F855A' : '#38A169' }]}
          onPress={() => navigation.navigate('AddSenior', { 
            onSuccess: () => fetchConnectedSeniors(true) 
          })}
        >
          <Ionicons name="person-add" size={24} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2F855A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  seniorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 16,
    backgroundColor: '#E2E8F0',
  },
  seniorInfo: {
    flex: 1,
  },
  seniorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  seniorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 2,
  },
  relationshipText: {
    fontSize: 14,
    color: '#718096',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastSeen: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    width: '100%',
    marginTop: 6,
  },
  infoText: {
    fontSize: 13,
    marginTop: 3,
  },
  metricsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metricText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#4A5568',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    color: '#4A5568',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A202C',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
  },
  deleteButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.3)',
  },
});

export default SeniorsListScreen;
