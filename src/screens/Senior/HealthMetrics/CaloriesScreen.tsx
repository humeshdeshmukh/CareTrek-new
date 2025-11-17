// src/screens/Senior/HealthMetrics/CaloriesScreen.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/theme/ThemeContext';
import { useBLEWatch } from '../../../hooks/useBLEWatch';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserHealthMetrics } from '../../../services/healthDataService';
import { supabase } from '../../../lib/supabase';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

const CaloriesScreen: React.FC<any> = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { watchData, syncDeviceData, isSyncing } = useBLEWatch();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyGoal] = useState(2000);

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

  // Load metrics
  const loadMetrics = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await getUserHealthMetrics(userId, 30);
      const caloriesData = data.filter(m => m.calories).slice(0, 7);
      setMetrics(caloriesData);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncDeviceData();
      await loadMetrics();
    } finally {
      setRefreshing(false);
    }
  }, [syncDeviceData, loadMetrics]);

  const handleMeasure = async () => {
    try {
      await syncDeviceData();
      await loadMetrics();
    } catch (error) {
      console.error('Error measuring:', error);
    }
  };

  const chartData = {
    labels: metrics.map(m => dayjs(m.timestamp).format('MMM DD')).reverse(),
    datasets: [
      {
        data: metrics.map(m => m.calories || 0).reverse(),
        color: () => '#FF9800',
        strokeWidth: 2,
      },
    ],
  };

  const currentCalories = watchData.calories || metrics[0]?.calories || 0;
  const totalCalories = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.calories || 0), 0)
    : 0;
  const avgCalories = metrics.length > 0
    ? Math.round(totalCalories / metrics.length)
    : 0;
  const maxCalories = metrics.length > 0
    ? Math.max(...metrics.map(m => m.calories || 0))
    : 0;
  const goalProgress = Math.min((currentCalories / dailyGoal) * 100, 100);

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
          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Calories</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Current Reading */}
        <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
          <View style={styles.currentReadingContainer}>
            <MaterialCommunityIcons name="fire" size={60} color="#FF9800" />
            <View style={styles.readingInfo}>
              <Text style={[styles.currentValue, { color: '#FF9800' }]}>{currentCalories}</Text>
              <Text style={[styles.readingLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Calories Today</Text>
              <Text style={[styles.readingTime, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                Goal: {dailyGoal.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: isDark ? '#1A202C' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${goalProgress}%`, backgroundColor: '#FF9800' },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
              {Math.round(goalProgress)}% of daily goal
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
          <MaterialCommunityIcons name="information" size={20} color="#FF9800" />
          <Text style={[styles.infoText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
            Calorie burn is estimated based on your activity, heart rate, and steps. Actual burn may vary.
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Average</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{avgCalories}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>kcal</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Maximum</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{maxCalories}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>kcal</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Total</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{totalCalories}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>kcal</Text>
          </View>
        </View>

        {/* Chart */}
        {metrics.length > 0 && (
          <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.chartTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>7-Day Trend</Text>
            <LineChart
              data={chartData}
              width={CHART_WIDTH}
              height={220}
              chartConfig={{
                backgroundColor: isDark ? '#2D3748' : '#F7FAFC',
                backgroundGradientFrom: isDark ? '#2D3748' : '#F7FAFC',
                backgroundGradientTo: isDark ? '#2D3748' : '#F7FAFC',
                decimalPlaces: 0,
                color: () => isDark ? '#A0AEC0' : '#718096',
                labelColor: () => isDark ? '#A0AEC0' : '#718096',
                style: { borderRadius: 16 },
              }}
              bezier
            />
          </View>
        )}

        {/* Measure Button */}
        <TouchableOpacity
          style={[styles.measureButton, { opacity: isSyncing ? 0.6 : 1 }]}
          onPress={handleMeasure}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="sync" size={20} color="#FFFFFF" />
              <Text style={styles.measureButtonText}>Sync from Watch</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  currentReadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readingInfo: {
    marginLeft: 20,
    flex: 1,
  },
  currentValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  readingLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  readingTime: {
    fontSize: 12,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 20,
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
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
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
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  measureButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  measureButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CaloriesScreen;
