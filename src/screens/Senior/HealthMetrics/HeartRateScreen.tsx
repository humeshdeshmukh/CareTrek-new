// src/screens/Senior/HealthMetrics/HeartRateScreen.tsx
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
import { demoModeService } from '../../../services/demoModeService';
import { supabase } from '../../../lib/supabase';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

const HeartRateScreen: React.FC<any> = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { watchData, syncDeviceData, isSyncing } = useBLEWatch();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
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
      const heartRateData = data.filter(m => m.heart_rate).slice(0, 7);
      setMetrics(heartRateData);
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
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [syncDeviceData, loadMetrics, cacheKey]);

  const handleMeasure = useCallback(async () => {
    try {
      await syncDeviceData();
      await loadMetrics();
      setCacheKey(prev => prev + 1);
    } catch (error) {
      console.error('Error measuring:', error);
    }
  }, [syncDeviceData, loadMetrics, cacheKey]);

  const chartData = {
    labels: metrics.length > 0 ? metrics.map(m => dayjs(m.timestamp).format('MMM DD')).reverse() : ['No data'],
    datasets: [
      {
        data: metrics.length > 0 ? metrics.map(m => m.heart_rate || 0).reverse() : [0],
        color: () => '#FF6B6B',
        strokeWidth: 2,
      },
    ],
  };

  const currentHeartRate = isDemoMode && demoData
    ? demoData.heartRate
    : watchData.heartRate || metrics[0]?.heart_rate || 0;
  const avgHeartRate = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.heart_rate || 0), 0) / metrics.length)
    : isDemoMode && demoData ? demoData.heartRate : 0;
  const maxHeartRate = metrics.length > 0
    ? Math.max(...metrics.map(m => m.heart_rate || 0))
    : isDemoMode && demoData ? demoData.heartRate : 0;
  const minHeartRate = metrics.length > 0 && metrics.filter(m => m.heart_rate).length > 0
    ? Math.min(...metrics.filter(m => m.heart_rate).map(m => m.heart_rate || 0))
    : isDemoMode && demoData ? demoData.heartRate : 0;

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
          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Heart Rate</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Current Reading */}
        <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
          <View style={styles.currentReadingContainer}>
            <MaterialCommunityIcons name="heart" size={60} color="#FF6B6B" />
            <View style={styles.readingInfo}>
              <Text style={[styles.currentValue, { color: '#FF6B6B' }]}>{currentHeartRate}</Text>
              <Text style={[styles.readingLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>BPM</Text>
              <Text style={[styles.readingTime, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                {watchData.lastUpdated ? dayjs(watchData.lastUpdated).format('HH:mm') : 'No data'}
              </Text>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Average</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{avgHeartRate}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>BPM</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Maximum</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{maxHeartRate}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>BPM</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Minimum</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{minHeartRate}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>BPM</Text>
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
              <MaterialCommunityIcons name="heart-pulse" size={20} color="#FFFFFF" />
              <Text style={styles.measureButtonText}>Measure Now</Text>
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
    backgroundColor: '#FF6B6B',
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

export default HeartRateScreen;
