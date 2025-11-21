// src/screens/Senior/DebugScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useBLEWatch } from '../../hooks/useBLEWatch';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getUserHealthMetrics } from '../../services/healthDataService';

const DebugScreen: React.FC<any> = ({ navigation }) => {
  const { isDark } = useTheme();
  const { watchData, syncDeviceData, isSyncing } = useBLEWatch();
  const [userId, setUserId] = useState<string | null>(null);
  const [dbMetrics, setDbMetrics] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

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

  // Load metrics from database
  const loadMetrics = async () => {
    if (!userId) return;
    try {
      const data = await getUserHealthMetrics(userId, 50);
      console.log('[DebugScreen] Fetched metrics from DB:', data);
      setDbMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMetrics();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncStatus('Syncing...');
      console.log('[DebugScreen] Current watchData:', watchData);
      const result = await syncDeviceData();
      console.log('[DebugScreen] Sync result:', result);
      setSyncStatus('Sync completed! Reloading...');
      await new Promise(r => setTimeout(r, 1000));
      await loadMetrics();
      setSyncStatus('✅ Done!');
    } catch (error) {
      console.error('[DebugScreen] Sync error:', error);
      setSyncStatus('❌ Error: ' + String(error));
    }
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
          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>🧪 Debug Console</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Connection Status */}
        <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC', borderLeftWidth: 4, borderLeftColor: watchData.status === 'connected' ? '#4CAF50' : '#E53E3E' }]}>
          <Text style={[styles.label, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Connection Status:</Text>
          <Text style={[styles.value, { color: watchData.status === 'connected' ? '#4CAF50' : '#E53E3E', fontWeight: 'bold' }]}>
            {watchData.status === 'connected' ? '✅ Connected' : '❌ Disconnected'}
          </Text>
        </View>

        {/* Sync Status */}
        {syncStatus ? (
          <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC', borderLeftWidth: 4, borderLeftColor: '#4299E1' }]}>
            <Text style={[styles.label, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Sync Status:</Text>
            <Text style={[styles.value, { color: '#4299E1', fontWeight: 'bold' }]}>{syncStatus}</Text>
          </View>
        ) : null}

        {/* Sync Button */}
        <TouchableOpacity
          style={[styles.button, { opacity: isSyncing ? 0.6 : 1 }]}
          onPress={handleSync}
          disabled={isSyncing}
        >
          <MaterialCommunityIcons name="sync" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
        </TouchableOpacity>

        {/* Live Watch Data */}
        <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>📱 Live Watch Data (watchData state)</Text>
          
          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Status:</Text>
            <Text style={[styles.value, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.status || 'N/A'}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Device Name:</Text>
            <Text style={[styles.value, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.deviceName || 'N/A'}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Device ID:</Text>
            <Text style={[styles.value, { color: isDark ? '#E2E8F0' : '#1A202C', fontSize: 11 }]}>{watchData.deviceId || 'N/A'}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Heart Rate:</Text>
            <Text style={[styles.value, { color: watchData.heartRate ? '#FF6B6B' : '#A0AEC0' }]}>
              {watchData.heartRate ? `${watchData.heartRate} bpm` : 'N/A'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Steps:</Text>
            <Text style={[styles.value, { color: watchData.steps ? '#4CAF50' : '#A0AEC0' }]}>
              {watchData.steps ? `${watchData.steps}` : 'N/A'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Oxygen:</Text>
            <Text style={[styles.value, { color: watchData.oxygenSaturation ? '#2196F3' : '#A0AEC0' }]}>
              {watchData.oxygenSaturation ? `${watchData.oxygenSaturation}%` : 'N/A'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Blood Pressure:</Text>
            <Text style={[styles.value, { color: watchData.bloodPressure ? '#FF9800' : '#A0AEC0' }]}>
              {watchData.bloodPressure ? `${watchData.bloodPressure.systolic}/${watchData.bloodPressure.diastolic}` : 'N/A'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Calories:</Text>
            <Text style={[styles.value, { color: watchData.calories ? '#FF6B6B' : '#A0AEC0' }]}>
              {watchData.calories ? `${watchData.calories}` : 'N/A'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Battery:</Text>
            <Text style={[styles.value, { color: watchData.battery ? '#4CAF50' : '#A0AEC0' }]}>
              {watchData.battery ? `${watchData.battery}%` : 'N/A'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.label, { color: isDark ? '#A0AEC0' : '#718096' }]}>Last Updated:</Text>
            <Text style={[styles.value, { color: isDark ? '#E2E8F0' : '#1A202C', fontSize: 11 }]}>
              {watchData.lastUpdated ? new Date(watchData.lastUpdated).toLocaleTimeString() : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Database Metrics */}
        <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>💾 Database Metrics ({dbMetrics.length})</Text>
          
          {dbMetrics.length === 0 ? (
            <Text style={[styles.noData, { color: isDark ? '#A0AEC0' : '#718096' }]}>No data in database yet</Text>
          ) : (
            dbMetrics.slice(0, 10).map((metric, idx) => (
              <View key={idx} style={[styles.metricCard, { backgroundColor: isDark ? '#1A202C' : '#FFFFFF', borderLeftColor: '#4CAF50' }]}>
                <Text style={[styles.metricTime, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                  {new Date(metric.timestamp).toLocaleTimeString()}
                </Text>
                <View style={styles.metricRow}>
                  {metric.heart_rate && <Text style={styles.metricBadge}>❤️ {metric.heart_rate} bpm</Text>}
                  {metric.steps && <Text style={styles.metricBadge}>👟 {metric.steps}</Text>}
                  {metric.blood_oxygen && <Text style={styles.metricBadge}>💨 {metric.blood_oxygen}%</Text>}
                  {metric.battery && <Text style={styles.metricBadge}>🔋 {metric.battery}%</Text>}
                  {metric.calories_burned && <Text style={styles.metricBadge}>🔥 {metric.calories_burned}</Text>}
                </View>
                {metric.blood_pressure_systolic && (
                  <Text style={[styles.metricSmall, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                    BP: {metric.blood_pressure_systolic}/{metric.blood_pressure_diastolic}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Raw JSON */}
        <View style={[styles.card, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>📋 Raw watchData JSON</Text>
          <Text style={[styles.json, { color: isDark ? '#A0AEC0' : '#718096' }]}>
            {JSON.stringify(watchData, null, 2)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  noData: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  metricCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  metricTime: {
    fontSize: 11,
    marginBottom: 6,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricBadge: {
    fontSize: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: '500',
  },
  metricSmall: {
    fontSize: 11,
    marginTop: 6,
  },
  json: {
    fontSize: 10,
    fontFamily: 'monospace',
    padding: 8,
  },
});

export default DebugScreen;
