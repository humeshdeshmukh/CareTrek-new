// src/screens/Senior/HealthMetrics/StepsScreen.tsx
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/theme/ThemeContext';
import { useBLEWatch } from '../../../hooks/useBLEWatch';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserHealthMetrics } from '../../../services/healthDataService';
import { demoModeService } from '../../../services/demoModeService';
import { supabase } from '../../../lib/supabase';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

const StepsScreen: React.FC<any> = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { watchData, syncDeviceData, isSyncing } = useBLEWatch();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyGoal] = useState(10000);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoData, setDemoData] = useState<any>(null);
  const [cacheKey, setCacheKey] = useState(0);

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
      const stepsData = data.filter(m => m.steps).slice(0, 7);
      setMetrics(stepsData);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Check demo mode
  useEffect(() => {
    const checkDemo = async () => {
      try {
        const isActive = demoModeService.isActive();
        setIsDemoMode(isActive);
        if (isActive) {
          const data = demoModeService.getMockData();
          setDemoData(data);
        }
      } catch (error) {
        console.warn('Demo mode check error:', error);
      }
    };
    checkDemo();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncDeviceData();
      await loadMetrics();
      setCacheKey(prev => prev + 1);
    } finally {
      setRefreshing(false);
    }
  }, [syncDeviceData, loadMetrics]);

  const handleMeasure = async () => {
    try {
      // Simply sync - permission is already requested on app startup
      await syncDeviceData();
      await loadMetrics();
    } catch (error) {
      console.error('Error measuring:', error);
      Alert.alert('Error', 'Failed to sync data from watch. Please try again.');
    }
  };

  const chartData = {
    labels: metrics.map(m => dayjs(m.timestamp).format('MMM DD')).reverse(),
    datasets: [
      {
        data: metrics.map(m => m.steps || 0).reverse(),
        color: () => '#4CAF50',
        strokeWidth: 2,
      },
    ],
  };

  const currentSteps = isDemoMode && demoData
    ? demoData.steps
    : watchData.steps || metrics[0]?.steps || 0;
  const totalSteps = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.steps || 0), 0)
    : 0;
  const avgSteps = metrics.length > 0
    ? Math.round(totalSteps / metrics.length)
    : 0;
  const maxSteps = metrics.length > 0
    ? Math.max(...metrics.map(m => m.steps || 0))
    : 0;
  const goalProgress = Math.min((currentSteps / dailyGoal) * 100, 100);

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
          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Steps</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Current Reading */}
        <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
          <View style={styles.currentReadingContainer}>
            <MaterialCommunityIcons name="walk" size={60} color="#4CAF50" />
            <View style={styles.readingInfo}>
              <Text style={[styles.currentValue, { color: '#4CAF50' }]}>{currentSteps}</Text>
              <Text style={[styles.readingLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Steps Today</Text>
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
                  { width: `${goalProgress}%`, backgroundColor: '#4CAF50' },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
              {Math.round(goalProgress)}% of daily goal
            </Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Average</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{avgSteps}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>steps</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Maximum</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{maxSteps}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>steps</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Total</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{totalSteps}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>steps</Text>
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
    backgroundColor: '#4CAF50',
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

export default StepsScreen;
