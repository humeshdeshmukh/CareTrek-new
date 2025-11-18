// src/screens/Senior/HealthMetrics/SleepScreen.tsx
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
import { BarChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getSleepSummary, getUserSleepRecords } from '../../../services/sleepTrackingService';
import { demoModeService } from '../../../services/demoModeService';
import { supabase } from '../../../lib/supabase';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

const SleepScreen: React.FC<any> = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { syncDeviceData, isSyncing } = useBLEWatch();
  const [sleepData, setSleepData] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
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

  // Load sleep data
  const loadSleepData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const summary = await getSleepSummary(userId, 7);
      setSleepData(summary);
      setRecords(summary.records || []);
    } catch (error) {
      console.error('Error loading sleep data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSleepData();
  }, [loadSleepData]);

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
      await loadSleepData();
      setCacheKey(prev => prev + 1);
    } finally {
      setRefreshing(false);
    }
  }, [syncDeviceData, loadSleepData]);

  const handleMeasure = async () => {
    try {
      await syncDeviceData();
      await loadSleepData();
    } catch (error) {
      console.error('Error measuring:', error);
    }
  };

  const chartData = {
    labels: records.map(r => dayjs(r.date).format('MMM DD')).slice(0, 7).reverse(),
    datasets: [
      {
        data: records.map(r => r.duration / 60).slice(0, 7).reverse(), // Convert to hours
        color: () => '#9C27B0',
        strokeWidth: 2,
      },
    ],
  };

  const getSleepQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#2196F3';
      case 'fair':
        return '#FF9800';
      case 'poor':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const latestRecord = isDemoMode && demoData?.sleepData
    ? {
        duration: demoData.sleepData.duration,
        quality: demoData.sleepData.quality,
        deep_sleep: Math.floor(demoData.sleepData.duration * 0.2),
        light_sleep: Math.floor(demoData.sleepData.duration * 0.5),
        rem_sleep: Math.floor(demoData.sleepData.duration * 0.2),
        awake_time: Math.floor(demoData.sleepData.duration * 0.1),
      }
    : records[0];
  const avgDuration = sleepData?.averageDuration || 0;
  const avgQuality = sleepData?.averageQuality || 'N/A';
  const totalNights = sleepData?.totalNights || 0;

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
          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Sleep Analysis</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Current Night */}
        {latestRecord && (
          <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Last Night</Text>
            <View style={styles.currentReadingContainer}>
              <MaterialCommunityIcons name="moon-waning-crescent" size={60} color="#9C27B0" />
              <View style={styles.readingInfo}>
                <Text style={[styles.currentValue, { color: '#9C27B0' }]}>
                  {Math.floor(latestRecord.duration / 60)}h {latestRecord.duration % 60}m
                </Text>
                <Text style={[styles.readingLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Duration</Text>
                <Text style={[styles.qualityBadge, { color: getSleepQualityColor(latestRecord.quality), borderColor: getSleepQualityColor(latestRecord.quality) }]}>
                  {latestRecord.quality.charAt(0).toUpperCase() + latestRecord.quality.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sleep Breakdown */}
        {latestRecord && (
          <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Sleep Breakdown</Text>
            <View style={styles.sleepBreakdown}>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownColor, { backgroundColor: '#FF6B6B' }]} />
                <View style={styles.breakdownInfo}>
                  <Text style={[styles.breakdownLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Deep Sleep</Text>
                  <Text style={[styles.breakdownValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                    {Math.floor(latestRecord.deep_sleep / 60)}h {latestRecord.deep_sleep % 60}m
                  </Text>
                </View>
              </View>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownColor, { backgroundColor: '#4CAF50' }]} />
                <View style={styles.breakdownInfo}>
                  <Text style={[styles.breakdownLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Light Sleep</Text>
                  <Text style={[styles.breakdownValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                    {Math.floor(latestRecord.light_sleep / 60)}h {latestRecord.light_sleep % 60}m
                  </Text>
                </View>
              </View>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownColor, { backgroundColor: '#2196F3' }]} />
                <View style={styles.breakdownInfo}>
                  <Text style={[styles.breakdownLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>REM Sleep</Text>
                  <Text style={[styles.breakdownValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                    {Math.floor(latestRecord.rem_sleep / 60)}h {latestRecord.rem_sleep % 60}m
                  </Text>
                </View>
              </View>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownColor, { backgroundColor: '#FF9800' }]} />
                <View style={styles.breakdownInfo}>
                  <Text style={[styles.breakdownLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Awake Time</Text>
                  <Text style={[styles.breakdownValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                    {Math.floor(latestRecord.awake_time / 60)}h {latestRecord.awake_time % 60}m
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Statistics */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Avg Duration</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              {Math.floor(avgDuration / 60)}h
            </Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>per night</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Avg Quality</Text>
            <Text style={[styles.statValue, { color: getSleepQualityColor(avgQuality) }]}>
              {typeof avgQuality === 'string' ? avgQuality.charAt(0).toUpperCase() + avgQuality.slice(1) : avgQuality}
            </Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>7-day avg</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Nights</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{totalNights}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>tracked</Text>
          </View>
        </View>

        {/* Chart */}
        {records.length > 0 && (
          <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.chartTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>7-Day Sleep Duration</Text>
            <BarChart
              data={chartData}
              width={CHART_WIDTH}
              height={220}
              yAxisLabel=""
              yAxisSuffix="h"
              chartConfig={{
                backgroundColor: isDark ? '#2D3748' : '#F7FAFC',
                backgroundGradientFrom: isDark ? '#2D3748' : '#F7FAFC',
                backgroundGradientTo: isDark ? '#2D3748' : '#F7FAFC',
                decimalPlaces: 1,
                color: () => isDark ? '#A0AEC0' : '#718096',
                labelColor: () => isDark ? '#A0AEC0' : '#718096',
                style: { borderRadius: 16 },
              }}
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
              <Text style={styles.measureButtonText}>Sync Sleep Data</Text>
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
    fontSize: 32,
    fontWeight: '700',
  },
  readingLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  qualityBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  sleepBreakdown: {
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
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
    backgroundColor: '#9C27B0',
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

export default SleepScreen;
