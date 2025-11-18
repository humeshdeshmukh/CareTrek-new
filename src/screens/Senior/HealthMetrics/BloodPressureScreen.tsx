// src/screens/Senior/HealthMetrics/BloodPressureScreen.tsx
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

const BloodPressureScreen: React.FC<any> = ({ navigation }) => {
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
      const bpData = data.filter(m => m.blood_pressure_systolic && m.blood_pressure_diastolic).slice(0, 7);
      setMetrics(bpData);
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
      await syncDeviceData();
      await loadMetrics();
    } catch (error) {
      console.error('Error measuring:', error);
    }
  };

  const currentSystolic = isDemoMode && demoData
    ? demoData.bloodPressure.systolic
    : watchData.bloodPressure?.systolic || metrics[0]?.blood_pressure_systolic || 0;
  const currentDiastolic = isDemoMode && demoData
    ? demoData.bloodPressure.diastolic
    : watchData.bloodPressure?.diastolic || metrics[0]?.blood_pressure_diastolic || 0;

  const avgSystolic = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.blood_pressure_systolic || 0), 0) / metrics.length)
    : 0;
  const avgDiastolic = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + (m.blood_pressure_diastolic || 0), 0) / metrics.length)
    : 0;

  // Determine BP status
  const getBPStatus = (systolic: number, diastolic: number) => {
    if (systolic < 120 && diastolic < 80) return { status: 'Normal', color: '#4CAF50' };
    if (systolic < 130 && diastolic < 80) return { status: 'Elevated', color: '#2196F3' };
    if (systolic < 140 && diastolic < 90) return { status: 'Stage 1 Hypertension', color: '#FF9800' };
    if (systolic >= 140 || diastolic >= 90) return { status: 'Stage 2 Hypertension', color: '#F44336' };
    return { status: 'Unknown', color: '#9E9E9E' };
  };

  const bpStatus = getBPStatus(currentSystolic, currentDiastolic);

  const chartData = {
    labels: metrics.map(m => dayjs(m.timestamp).format('MMM DD')).reverse(),
    datasets: [
      {
        data: metrics.map(m => m.blood_pressure_systolic || 0).reverse(),
        color: () => '#FF6B6B',
        strokeWidth: 2,
        legend: ['Systolic'],
      },
      {
        data: metrics.map(m => m.blood_pressure_diastolic || 0).reverse(),
        color: () => '#4CAF50',
        strokeWidth: 2,
        legend: ['Diastolic'],
      },
    ],
  };

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
          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Blood Pressure</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Current Reading */}
        <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
          <View style={styles.currentReadingContainer}>
            <MaterialCommunityIcons name="heart-pulse" size={60} color={bpStatus.color} />
            <View style={styles.readingInfo}>
              <View style={styles.bpValues}>
                <Text style={[styles.currentValue, { color: bpStatus.color }]}>{currentSystolic}</Text>
                <Text style={[styles.bpSeparator, { color: isDark ? '#A0AEC0' : '#718096' }]}>/</Text>
                <Text style={[styles.currentValue, { color: bpStatus.color }]}>{currentDiastolic}</Text>
              </View>
              <Text style={[styles.readingLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>mmHg</Text>
              <Text style={[styles.statusText, { color: bpStatus.color }]}>{bpStatus.status}</Text>
            </View>
          </View>
        </View>

        {/* Status Info */}
        <View style={[styles.infoCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC', borderLeftColor: bpStatus.color }]}>
          <MaterialCommunityIcons name="information" size={20} color={bpStatus.color} />
          <Text style={[styles.infoText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
            Normal: Less than 120/80 mmHg. Elevated: 120-129 and less than 80. Hypertension: 130 or higher and/or 80 or higher.
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Avg Systolic</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{avgSystolic}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>mmHg</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Avg Diastolic</Text>
            <Text style={[styles.statValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{avgDiastolic}</Text>
            <Text style={[styles.statUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>mmHg</Text>
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
    flex: 1,
  },
  bpValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  bpSeparator: {
    fontSize: 24,
    marginHorizontal: 4,
  },
  readingLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
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
    backgroundColor: '#E91E63',
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

export default BloodPressureScreen;
