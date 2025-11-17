// src/screens/Senior/HealthMetrics/HydrationScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/theme/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getHydrationSummary, addHydrationEntry, getTodayHydrationRecord } from '../../../services/hydrationTrackingService';
import { supabase } from '../../../lib/supabase';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HydrationScreen: React.FC<any> = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const [hydrationData, setHydrationData] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState('250');
  const [selectedType, setSelectedType] = useState<'water' | 'juice' | 'tea' | 'coffee' | 'milk' | 'other'>('water');
  const [adding, setAdding] = useState(false);

  const waterTypes = [
    { type: 'water' as const, label: 'Water', icon: 'water', color: '#2196F3' },
    { type: 'juice' as const, label: 'Juice', icon: 'cup', color: '#FF9800' },
    { type: 'tea' as const, label: 'Tea', icon: 'cup-hot', color: '#8B4513' },
    { type: 'coffee' as const, label: 'Coffee', icon: 'coffee', color: '#6F4E37' },
    { type: 'milk' as const, label: 'Milk', icon: 'bottle-milk', color: '#F5F5F5' },
    { type: 'other' as const, label: 'Other', icon: 'water-percent', color: '#9E9E9E' },
  ];

  const commonAmounts = [250, 500, 750, 1000];

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  // Load hydration data
  const loadHydrationData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const summary = await getHydrationSummary(userId, 7);
      setHydrationData(summary);
      const today = await getTodayHydrationRecord(userId);
      setTodayRecord(today);
    } catch (error) {
      console.error('Error loading hydration data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHydrationData();
  }, [loadHydrationData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHydrationData();
    } finally {
      setRefreshing(false);
    }
  }, [loadHydrationData]);

  const handleAddWater = async () => {
    if (!userId || !selectedAmount) return;
    try {
      setAdding(true);
      await addHydrationEntry(userId, parseInt(selectedAmount), selectedType);
      await loadHydrationData();
      setShowAddModal(false);
      setSelectedAmount('250');
      setSelectedType('water');
    } catch (error) {
      console.error('Error adding water:', error);
    } finally {
      setAdding(false);
    }
  };

  const goalProgress = todayRecord
    ? Math.min((todayRecord.water_intake / todayRecord.goal) * 100, 100)
    : 0;

  const remaining = todayRecord
    ? Math.max(todayRecord.goal - todayRecord.water_intake, 0)
    : 2000;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1A202C' : '#FFFFFF' }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? '#E2E8F0' : '#1A202C'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Hydration</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Today's Progress */}
        {todayRecord && (
          <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Today's Intake</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressCircle}>
                <Text style={[styles.progressValue, { color: '#2196F3' }]}>
                  {todayRecord.water_intake}
                </Text>
                <Text style={[styles.progressUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>ml</Text>
              </View>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                  Goal: {todayRecord.goal} ml
                </Text>
                <Text style={[styles.progressLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                  Remaining: {remaining} ml
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressBar, { backgroundColor: isDark ? '#1A202C' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${goalProgress}%`, backgroundColor: '#2196F3' },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
              {Math.round(goalProgress)}% of daily goal
            </Text>
          </View>
        )}

        {/* Statistics */}
        {hydrationData && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
              <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Avg Daily</Text>
              <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                {hydrationData.averageIntake}
              </Text>
              <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>ml</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
              <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Goal Achievement</Text>
              <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                {hydrationData.goalAchievementRate}%
              </Text>
              <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>7-day</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
              <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Days Tracked</Text>
              <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                {hydrationData.totalDays}
              </Text>
              <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>days</Text>
            </View>
          </View>
        )}

        {/* Quick Add Buttons */}
        <View style={styles.quickAddContainer}>
          <Text style={[styles.quickAddTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Quick Add</Text>
          <View style={styles.quickAddButtons}>
            {commonAmounts.map(amount => (
              <TouchableOpacity
                key={amount}
                style={[styles.quickAddButton, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}
                onPress={async () => {
                  if (userId) {
                    try {
                      await addHydrationEntry(userId, amount, 'water');
                      await loadHydrationData();
                    } catch (error) {
                      console.error('Error adding water:', error);
                    }
                  }
                }}
              >
                <MaterialCommunityIcons name="water" size={24} color="#2196F3" />
                <Text style={[styles.quickAddButtonText, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                  {amount}ml
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Add Custom Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Custom Amount</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Water Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Add Hydration</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={isDark ? '#E2E8F0' : '#1A202C'} />
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Amount (ml)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#1A202C' : '#F7FAFC', color: isDark ? '#E2E8F0' : '#1A202C' }]}
                placeholder="Enter amount"
                placeholderTextColor={isDark ? '#718096' : '#A0AEC0'}
                keyboardType="number-pad"
                value={selectedAmount}
                onChangeText={setSelectedAmount}
              />
            </View>

            {/* Type Selection */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Type</Text>
              <View style={styles.typeGrid}>
                {waterTypes.map(item => (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: selectedType === item.type ? item.color : (isDark ? '#1A202C' : '#F7FAFC'),
                        borderColor: selectedType === item.type ? item.color : (isDark ? '#404854' : '#E2E8F0'),
                      },
                    ]}
                    onPress={() => setSelectedType(item.type)}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={24}
                      color={selectedType === item.type ? '#FFFFFF' : item.color}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: selectedType === item.type ? '#FFFFFF' : (isDark ? '#A0AEC0' : '#718096') },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={[styles.modalAddButton, { opacity: adding ? 0.6 : 1 }]}
              onPress={handleAddWater}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.modalAddButtonText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  progressValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  progressUnit: {
    fontSize: 12,
    marginTop: 4,
  },
  progressInfo: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statUnit: {
    fontSize: 11,
    marginTop: 4,
  },
  quickAddContainer: {
    marginBottom: 16,
  },
  quickAddTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickAddButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAddButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  modalAddButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  modalAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HydrationScreen;
