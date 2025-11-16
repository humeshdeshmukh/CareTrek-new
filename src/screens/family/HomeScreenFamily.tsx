import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, FlatList, Image, Alert } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

interface Senior {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'alert';
  lastActive: string;
  avatar_url?: string;
  email?: string;
}

type RootStackParamList = {
  AddSenior: undefined;
  SeniorDetail: { seniorId: string };
  Health: undefined;
  Medication: undefined;
  Reminders: undefined;
  SeniorAppointments: { seniorId: string };
  HealthHistory: { seniorId: string };
};

const HomeScreenFamily = () => {
  const navigation = useNavigation<any>(); // Using any to avoid type issues with navigation
  const { isDark, colors } = useTheme();
  const { t } = useTranslation();
  const [connectedSeniors, setConnectedSeniors] = useState<Senior[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  
  // Get text color based on theme
  const textColor = isDark ? colors.text : '#1F2937';

  // Define the type for the relationship with profile
  interface UserProfile {
    id: string;
    full_name?: string;
    avatar_url?: string;
    email?: string;
  }

  interface RelationshipWithProfile {
    senior_user_id: string;
    user_profiles: UserProfile[];
  }

  // Fetch connected seniors
  const fetchConnectedSeniors = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      // First, get the relationships
      const { data: relationships, error: relError } = await supabase
        .from('family_relationships')
        .select('senior_user_id, created_at, status')
        .eq('family_member_id', user.id);

      if (relError) throw relError;

      if (!relationships || relationships.length === 0) {
        setConnectedSeniors([]);
        setLoading(false);
        return;
      }

      const seniorUserIds = relationships.map(rel => rel.senior_user_id).filter(Boolean);
      
      if (seniorUserIds.length === 0) {
        setConnectedSeniors([]);
        setLoading(false);
        return;
      }

      // Then get the user profiles
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', seniorUserIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        throw profilesError;
      }

      // Transform the data
      const seniors = relationships.map(rel => {
        const profile = userProfiles?.find(p => p.id === rel.senior_user_id);
        
        return {
          id: rel.senior_user_id,
          name: profile?.full_name || `Senior ${rel.senior_user_id.substring(0, 6)}`,
          status: (rel.status as 'online' | 'offline' | 'alert') || 'offline',
          lastActive: rel.created_at 
            ? new Date(rel.created_at).toLocaleString() 
            : 'Unknown',
          avatar_url: profile?.avatar_url,
          email: `${rel.senior_user_id}@caretrek.app` // Placeholder email
        } as Senior;
      });

      setConnectedSeniors(seniors);
    } catch (error) {
      console.error('Error in fetchConnectedSeniors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchConnectedSeniors();
    }
  }, [isFocused]);

  const navigateToHealthHistory = (seniorId: string) => (event: any) => {
    event.stopPropagation();
    navigation.navigate('HealthHistory', { seniorId });
  };

  const navigateToSeniorDetail = (seniorId: string) => {
    navigation.navigate('SeniorDetail', { seniorId });
  };

  const handleAddSenior = () => {
    navigation.navigate('AddSenior');
  };
  
  const navigateToScreen = (screenName: keyof Omit<RootStackParamList, 'HealthHistory' | 'SeniorDetail'>) => {
    navigation.navigate(screenName);
  };

  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('Good Morning');
    if (hour < 18) return t('Good Afternoon');
    return t('Good Evening');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollView}
      >
        {/* Header with Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              {t('CareTrek')}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationIcon}>
            <Ionicons name="notifications-outline" size={24} color={isDark ? '#E2E8F0' : '#1E293B'} />
            <View style={[styles.notificationBadge, { backgroundColor: isDark ? '#4F46E5' : '#4F46E5' }]} />
          </TouchableOpacity>
        </View>

        {/* Stats Overview with Add Senior */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#3B82F6' : '#3B82F6' }]}>
              <Ionicons name="people" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{connectedSeniors.length}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('Seniors')}</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4' }]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#10B981' : '#10B981' }]}>
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>0</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('Active')}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.statCard, { 
              backgroundColor: isDark ? '#2D3748' : '#F1F5F9',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 12
            }]}
            onPress={handleAddSenior}
          >
            <View style={[styles.statIcon, { backgroundColor: isDark ? '#4F46E5' : '#4F46E5' }]}>
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>+</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('Add Senior')}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', marginBottom: 16 }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#1E293B', marginBottom: 16 }]}>
            {t('Quick Actions')}
          </Text>
          
          <View style={styles.quickActionsGrid}>
            {/* Health */}
            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#F1F5F9' }]}
              onPress={() => navigation.navigate('Health' as never)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: isDark ? '#4F46E5' : '#4F46E5' }]}>
                <Ionicons name="heart" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                {t('Health')}
              </Text>
            </TouchableOpacity>
            
            {/* Medication */}
            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#F1F5F9' }]}
              onPress={() => {
                if (connectedSeniors.length > 0) {
                  navigation.navigate('Medication', { 
                    seniorId: connectedSeniors[0].id,
                    seniorName: connectedSeniors[0].name,
                    seniorAvatar: connectedSeniors[0].avatar_url,
                    status: connectedSeniors[0].status
                  });
                } else {
                  // Handle case when there are no connected seniors
                  Alert.alert('No Connected Seniors', 'Please add a senior first.');
                }
              }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: isDark ? '#10B981' : '#10B981' }]}>
                <Ionicons name="medkit" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                {t('Medication')}
              </Text>
            </TouchableOpacity>
            
            {/* Reminders */}
            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#F1F5F9' }]}
              onPress={() => {
                if (connectedSeniors.length > 0) {
                  navigation.navigate('Reminders', { 
                    seniorId: connectedSeniors[0].id,
                    seniorName: connectedSeniors[0].name,
                    seniorAvatar: connectedSeniors[0].avatar_url,
                    status: connectedSeniors[0].status
                  });
                } else {
                  // Handle case when there are no connected seniors
                  Alert.alert('No Connected Seniors', 'Please add a senior first.');
                }
              }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: isDark ? '#F59E0B' : '#F59E0B' }]}>
                <Ionicons name="notifications" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                {t('Reminders')}
              </Text>
            </TouchableOpacity>
            
            {/* Appointments */}
            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#F1F5F9' }]}
              onPress={() => navigation.navigate('SeniorAppointments', { seniorId: '' })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: isDark ? '#EC4899' : '#EC4899' }]}>
                <Ionicons name="calendar" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                {t('Appointments')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connected Seniors */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              {t('Connected Seniors')}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SeniorDetail', { seniorId: '' })}>
              <Text style={[styles.seeAll, { color: isDark ? '#818CF8' : '#4F46E5' }]}>
                {t('See All')}
              </Text>
            </TouchableOpacity>
          </View>
          
          {connectedSeniors.length > 0 ? (
            <FlatList
              data={connectedSeniors}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.seniorsList}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.seniorCard, { 
                    backgroundColor: isDark ? '#2D3748' : '#F8FAFC',
                    borderColor: isDark ? '#374151' : '#E2E8F0'
                  }]}
                  onPress={() => navigateToSeniorDetail(item.id)}
                >
                  <View style={styles.seniorAvatar}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#374151' : '#E2E8F0' }]}>
                        <Ionicons 
                          name="person" 
                          size={32} 
                          color={isDark ? '#9CA3AF' : '#6B7280'} 
                        />
                      </View>
                    )}
                    <View 
                      style={[
                        styles.statusDot, 
                        { 
                          backgroundColor: item.status === 'online' ? '#10B981' : 
                                         item.status === 'alert' ? '#EF4444' : '#9CA3AF',
                          borderColor: isDark ? '#1F2937' : '#F9FAFB'
                        }
                      ]} 
                    />
                  </View>
                  <Text 
                    style={[styles.seniorName, { color: isDark ? '#F3F4F6' : '#1F2937' }]} 
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.seniorStatus, { color: item.status === 'online' ? '#10B981' : '#9CA3AF' }]}>
                    {item.status === 'online' ? t('Online') : t('Offline')}
                  </Text>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="people-outline" 
                size={48} 
                color={isDark ? '#4B5563' : '#9CA3AF'} 
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {t('No seniors connected yet')}
              </Text>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: isDark ? '#4F46E5' : '#4F46E5' }]}
                onPress={handleAddSenior}
              >
                <Ionicons name="person-add" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>{t('Connect a Senior')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Activity
        <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              {t('Recent Activity')}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: isDark ? '#818CF8' : '#4F46E5' }]}>
                {t('See All')}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: isDark ? '#3B82F6' : '#3B82F6' }]}>
              <Ionicons name="notifications" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.activityContent}>
              <Text style={[styles.activityText, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>
                <Text style={{ fontWeight: '600' }}>No recent activity</Text>
              </Text>
              <Text style={[styles.activityTime, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Just now
              </Text>
            </View>
          </View>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },
  notificationIcon: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Quick action styles are now defined above
  seniorsList: {
    paddingVertical: 8,
  },
  seniorCard: {
    width: 140,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  seniorAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  seniorName: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: '100%',
  },
  seniorStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
});

export default HomeScreenFamily;
