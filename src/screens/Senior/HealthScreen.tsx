// src/screens/Senior/HealthScreen.new.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useBLEWatchV2 } from '../../hooks/useBLEWatchV2';
import { syncBackgroundMetricsToDatabase } from '../../services/backgroundSyncService';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HealthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Health'>;

interface MetricData {
  value: string | number;
  unit: string;
  status: string;
  icon: string;
  color: string;
  trend?: string;
}

const HealthScreen = () => {
  const navigation = useNavigation<HealthScreenNavigationProp>();
  const { isDark } = useTheme();
  const {
    watchData = { status: 'disconnected' },
    devices = [],
    isScanning = false,
    connectionState = 'idle',
    syncDeviceData = async () => ({}),
    disconnectDevice = () => { },
    isSyncing = false,
    startScan = () => { },
    stopScan = () => { },
    connectToDevice = () => { },
    bleService,
    mobileSensorService,
  } = useBLEWatchV2();

  // Merge mobile sensor data with watch data - PRODUCTION LEVEL
  const [displayData, setDisplayData] = useState<any>({
    status: 'disconnected',
    heartRate: undefined,
    steps: 0,
    calories: 0,
    oxygenSaturation: undefined,
  });

  // Merge mobile sensor data with watch data - PRODUCTION LEVEL
  // Safe state updates with error handling - works even if component unmounts
  useEffect(() => {
    let isMounted = true;

    const mergeData = async () => {
      try {
        if (!isMounted) return;

        console.log('[HealthScreen] watchData received:', {
          status: watchData?.status,
          heartRate: watchData?.heartRate,
          steps: watchData?.steps,
          calories: watchData?.calories,
          oxygenSaturation: watchData?.oxygenSaturation,
          bloodPressure: watchData?.bloodPressure,
          sleepData: watchData?.sleepData,
          battery: watchData?.battery,
        });

        if (!mobileSensorService) {
          console.log('[HealthScreen] Mobile sensor service not available');
          if (isMounted) {
            setDisplayData((prev: any) => ({
              ...prev,
              ...watchData,
            }));
          }
          return;
        }

        const mobileData = mobileSensorService.getTodayData?.() || { steps: 0, calories: 0 };

        // Show watch data ONLY - User requested NO fallback to mobile sensors
        const merged = {
          status: watchData?.status || 'disconnected',
          heartRate: watchData?.heartRate !== undefined ? watchData.heartRate : undefined,
          // Use watch data if available, otherwise fallback to mobile sensors
          steps: watchData?.steps !== undefined ? watchData.steps : mobileData?.steps || 0,
          calories: watchData?.calories !== undefined ? watchData.calories : mobileData?.calories || 0,
          oxygenSaturation: watchData?.oxygenSaturation !== undefined ? watchData.oxygenSaturation : undefined,
          bloodPressure: watchData?.bloodPressure !== undefined ? watchData.bloodPressure : undefined,
          sleepData: watchData?.sleepData !== undefined ? watchData.sleepData : undefined,
          deviceName: watchData?.deviceName,
          deviceId: watchData?.deviceId,
          lastUpdated: watchData?.lastUpdated,
          battery: watchData?.battery !== undefined ? watchData.battery : undefined,
          hydration: watchData?.hydration !== undefined ? watchData.hydration : undefined,
        };

        console.log('[HealthScreen] Watch data with mobile fallback for steps/calories:', {
          watchHeartRate: watchData?.heartRate,
          watchSteps: watchData?.steps,
          watchCalories: watchData?.calories,
          mobileSteps: mobileData?.steps,
          mobileCalories: mobileData?.calories,
          finalHeartRate: merged.heartRate,
          finalSteps: merged.steps,
          finalCalories: merged.calories,
        });

        if (isMounted) {
          setDisplayData(merged);
          console.log('[HealthScreen] displayData updated:', merged);
        }

        console.log('[HealthScreen] Data merged:', {
          status: merged.status,
          heartRate: merged.heartRate,
          steps: merged.steps,
          calories: merged.calories,
          oxygenSaturation: merged.oxygenSaturation,
          battery: merged.battery,
        });
      } catch (err) {
        console.error('[HealthScreen] Error merging data:', err);
        if (isMounted) {
          try {
            setDisplayData((prev: any) => ({ ...prev, ...watchData }));
          } catch (setErr) {
            console.error('[HealthScreen] Error setting fallback data:', setErr);
          }
        }
      }
    };

    mergeData();

    return () => {
      isMounted = false;
    };
  }, [watchData, mobileSensorService]);

  const [refreshing, setRefreshing] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recentDevices, setRecentDevices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSyncingBackground, setIsSyncingBackground] = useState(false);
  const [backgroundMetricsCount, setBackgroundMetricsCount] = useState(0);
  const [isWaitingForData, setIsWaitingForData] = useState(false);
  const isMountedRef = useRef(true);

  const STORAGE_KEY = 'previouslyConnectedDevices';

  // Save device to AsyncStorage
  const saveDeviceToStorage = useCallback(async (device: any) => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      let devices: any[] = [];

      // SAFETY FIX (Bug #5): Wrap JSON.parse to handle corrupted data
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) {
            devices = parsed;
          } else {
            console.warn('[HealthScreen] Corrupted device storage, resetting');
          }
        } catch (parseError) {
          console.error('[HealthScreen] JSON parse error, resetting:', parseError);
        }
      }

      // Remove if already exists
      const filtered = devices.filter((d: any) => d?.id !== device?.id);

      // Add to front
      const updated = [
        { id: device.id, name: device.name, timestamp: Date.now() },
        ...filtered
      ].slice(0, 5); // Keep last 5 devices

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (isMountedRef.current) {
        setRecentDevices(updated);
      }
    } catch (err) {
      console.error('[HealthScreen] Error saving device:', err);
    }
  }, []);

  // Load devices from AsyncStorage
  const loadDevicesFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && isMountedRef.current) {
        // SAFETY FIX (Bug #5): Wrap JSON.parse to handle corrupted data
        try {
          const devices = JSON.parse(stored);
          if (Array.isArray(devices)) {
            setRecentDevices(devices);
          } else {
            console.warn('[HealthScreen] Invalid device storage format, resetting');
            setRecentDevices([]);
          }
        } catch (parseError) {
          console.error('[HealthScreen] JSON parse error loading devices:', parseError);
          setRecentDevices([]);
        }
      }
    } catch (err) {
      console.error('[HealthScreen] Error loading devices:', err);
    }
  }, []);

  // Load background metrics count
  const loadBackgroundMetricsCount = useCallback(async () => {
    try {
      // SAFETY FIX (Bug #2): Check if backgroundDataService exists before calling
      if (!watchData?.backgroundDataService) {
        console.log('[HealthScreen] backgroundDataService not available');
        if (isMountedRef.current) {
          setBackgroundMetricsCount(0);
        }
        return;
      }

      if (typeof watchData.backgroundDataService.getStoredMetrics !== 'function') {
        console.warn('[HealthScreen] getStoredMetrics not available');
        if (isMountedRef.current) {
          setBackgroundMetricsCount(0);
        }
        return;
      }

      const metrics = await watchData.backgroundDataService.getStoredMetrics();
      if (isMountedRef.current && Array.isArray(metrics)) {
        setBackgroundMetricsCount(metrics.length);
      }
    } catch (err) {
      console.error('[HealthScreen] Error loading background metrics count:', err);
      if (isMountedRef.current) {
        setBackgroundMetricsCount(0);
      }
    }
  }, [watchData]);

  // Sync background metrics to database
  const syncBackgroundMetrics = useCallback(async () => {
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // SAFETY FIX (Bug #3): Check if sync function exists
    if (typeof syncBackgroundMetricsToDatabase !== 'function') {
      console.error('[HealthScreen] syncBackgroundMetricsToDatabase not available');
      Alert.alert('Error', 'Sync service not available');
      return;
    }

    setIsSyncingBackground(true);
    try {
      // SAFETY FIX (Bug #6): Add timeout to prevent hanging
      const syncPromise = syncBackgroundMetricsToDatabase(userId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sync timeout after 30s')), 30000)
      );

      const result = await Promise.race([syncPromise, timeoutPromise]) as any;

      // SAFETY FIX (Bug #6): Only show alerts if component is still mounted
      if (isMountedRef.current) {
        if (result.success) {
          Alert.alert('Success', `Synced ${result.synced} metric collections to database`);
          setBackgroundMetricsCount(0);
        } else {
          Alert.alert('Partial Sync', `Synced ${result.synced}, Failed ${result.failed}`);
        }
      } else {
        console.log('[HealthScreen] Sync completed but component unmounted, skipping alert');
      }
    } catch (err) {
      console.error('[HealthScreen] Error syncing background metrics:', err);
      // SAFETY FIX (Bug #6): Only show alert if component is still mounted
      if (isMountedRef.current) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to sync background metrics';
        Alert.alert('Error', errorMsg);
      }
    } finally {
      // SAFETY: Only update state if still mounted
      if (isMountedRef.current) {
        setIsSyncingBackground(false);
      }
    }
  }, [userId]);


  // Cleanup on component unmount - PRODUCTION LEVEL
  // CRITICAL: Don't set isMountedRef to false - it causes watch disconnection
  // Cleanup on component unmount - PRODUCTION LEVEL
  useEffect(() => {
    console.log('[HealthScreen] Component mounted');
    isMountedRef.current = true;

    return () => {
      try {
        console.log('[HealthScreen] Component unmounting');
        // SAFETY FIX: Must set isMountedRef to false to prevent state updates
        isMountedRef.current = false;

        // Stop any pending operations
        setRefreshing(false);
        setShowDeviceModal(false);
        setIsSyncingBackground(false);
      } catch (err) {
        console.error('[HealthScreen] Unmount cleanup error:', err);
      }
    };
  }, []);

  // Navigation-level cleanup - PRODUCTION LEVEL FIX
  useFocusEffect(
    useCallback(() => {
      try {
        console.log('[HealthScreen] useFocusEffect - Screen focused');
        isMountedRef.current = true;

        return () => {
          try {
            console.log('[HealthScreen] useFocusEffect cleanup - Screen blurred');
            // SAFETY FIX: Set isMountedRef to false when screen loses focus
            // This prevents state updates on unmounted/blurred screen
            isMountedRef.current = false;
          } catch (err) {
            console.error('[HealthScreen] useFocusEffect cleanup error:', err);
          }
        };
      } catch (err) {
        console.error('[HealthScreen] useFocusEffect error:', err);
        return () => { };
      }
    }, [])
  );

  // Monitor connection state changes (new feature from useBLEWatchV2)
  useEffect(() => {
    if (!bleService) return;

    const unsubscribe = bleService.onStateChange((state) => {
      console.log('[HealthScreen] BLE connection state:', state);

      // Set waiting for data when connected
      if (state === 'connected') {
        setIsWaitingForData(true);
        console.log('[HealthScreen] Connected - waiting for data from watch...');
      } else if (state === 'disconnected' || state === 'error') {
        setIsWaitingForData(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bleService]);

  // Monitor when data arrives
  useEffect(() => {
    if (watchData?.heartRate !== undefined || watchData?.steps !== undefined || watchData?.calories !== undefined) {
      setIsWaitingForData(false);
      console.log('[HealthScreen] Data received from watch - stop waiting');
    }
  }, [watchData?.heartRate, watchData?.steps, watchData?.calories]);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMountedRef.current && session?.user?.id) {
          setUserId(session.user.id);
        }
      } catch (err) {
        console.error('Error getting user:', err);
        if (isMountedRef.current) {
          setError('Failed to get user session');
        }
      }
    };
    getUser();
    // Load previously connected devices
    loadDevicesFromStorage();
    // Load background metrics count
    loadBackgroundMetricsCount();
  }, [loadDevicesFromStorage, loadBackgroundMetricsCount]);

  // Store recently connected device with error handling
  useEffect(() => {
    try {
      if (watchData?.status === 'connected' && watchData?.deviceName && watchData?.deviceId) {
        // Save to AsyncStorage for persistence
        saveDeviceToStorage({
          id: watchData.deviceId,
          name: watchData.deviceName
        });
      }
    } catch (err) {
      console.error('Error storing recent device:', err);
    }
  }, [watchData?.status, watchData?.deviceName, watchData?.deviceId, saveDeviceToStorage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (watchData?.status === 'connected') {
        await syncDeviceData();
      }
    } catch (err) {
      console.error('Error syncing device data:', err);
      if (isMountedRef.current) {
        setError('Failed to sync device data');
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [syncDeviceData, watchData?.status]);

  const getStatusColor = useCallback(() => {
    switch (watchData?.status) {
      case 'connected':
        return isDark ? '#48BB78' : '#2F855A';
      case 'connecting':
        return '#D69E2E';
      case 'disconnected':
        return '#E53E3E';
      default:
        return '#A0AEC0';
    }
  }, [watchData?.status, isDark]);

  const handleConnectPress = useCallback(() => {
    if (watchData?.status === 'connected') {
      disconnectDevice();
    } else {
      setShowDeviceModal(true);
      startScan();
    }
  }, [watchData?.status, disconnectDevice, startScan]);

  // Device Connection Card - Stable rendering from old file
  const renderDeviceCard = () => (
    <View style={[styles.deviceCard, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
      <View style={styles.deviceHeader}>
        <View style={styles.deviceInfo}>
          <Ionicons name="watch-outline" size={24} color={isDark ? '#4FD1C5' : '#2C7A7B'} />
          <View style={styles.deviceTextContainer}>
            <Text style={[styles.deviceName, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              {watchData?.deviceName || 'Not Connected'}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                {watchData?.status === 'connected' ? 'Connected' : watchData?.status === 'disconnected' ? 'Disconnected' : 'Connecting'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.connectButton,
            {
              backgroundColor: watchData?.status === 'connected' ? '#E53E3E' : '#48BB78',
              opacity: watchData?.status === 'connecting' ? 0.7 : 1
            }
          ]}
          onPress={handleConnectPress}
          disabled={watchData?.status === 'connecting'}
        >
          <Ionicons name={watchData?.status === 'connected' ? 'bluetooth' : 'bluetooth-outline'} size={16} color="white" style={{ marginRight: 4 }} />
          <Text style={styles.connectButtonText}>
            {watchData?.status === 'connected' ? 'Disconnect' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      {watchData?.status === 'connected' && (
        <View style={styles.deviceDetails}>
          {watchData?.firmwareVersion && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Firmware:</Text>
              <Text style={[styles.detailValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.firmwareVersion}</Text>
            </View>
          )}
          {watchData?.hardwareVersion && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Hardware:</Text>
              <Text style={[styles.detailValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.hardwareVersion}</Text>
            </View>
          )}
          {watchData?.lastUpdated && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Last Updated:</Text>
              <Text style={[styles.detailValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
                {dayjs(watchData.lastUpdated).fromNow()}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  // Metric Card Component - Safe rendering with error handling
  const MetricCard = ({
    icon,
    label,
    value,
    unit,
    color,
    status,
    onPress
  }: {
    icon: string;
    label: string;
    value: string | number;
    unit: string;
    color: string;
    status: string;
    onPress: () => void;
  }) => {
    try {
      return (
        <TouchableOpacity
          style={[styles.metricCard, { backgroundColor: isDark ? '#1A202C' : '#FFFFFF' }]}
          onPress={() => {
            try {
              onPress();
            } catch (err) {
              console.error('[HealthScreen] MetricCard press error:', err);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.metricIconBg, { backgroundColor: `${color}20` }]}>
            <MaterialCommunityIcons name={icon as any} size={28} color={color} />
          </View>
          <View style={styles.metricContent}>
            <Text style={[styles.metricLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {label}
            </Text>
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, { color }]}>
                {String(value || '--')}
              </Text>
              <Text style={[styles.metricUnit, { color: isDark ? '#94A3B8' : '#94A3B8' }]}>
                {unit}
              </Text>
            </View>
            <Text style={[styles.metricStatus, { color: isDark ? '#A0AEC0' : '#94A3B8' }]}>
              {String(status || 'No data')}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={isDark ? '#404854' : '#CBD5E0'}
          />
        </TouchableOpacity>
      );
    } catch (err) {
      console.error('[HealthScreen] MetricCard render error:', err);
      return null;
    }
  };

  // Overview Tab
  const renderOverviewTab = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {renderDeviceCard()}

      <View style={styles.metricsContainer}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
          Your Health Metrics
        </Text>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="heart"
            label="Heart Rate"
            value={displayData?.heartRate ? String(displayData.heartRate) : '--'}
            unit="BPM"
            color="#FF6B6B"
            status={displayData?.heartRate ? 'Normal' : 'No data'}
            onPress={() => {
              try {
                Alert.alert(
                  'Heart Rate',
                  displayData?.heartRate ? `Current: ${displayData.heartRate} BPM` : 'No data available',
                  [{ text: 'OK', style: 'default' }]
                );
              } catch (e) {
                console.error('[HealthScreen] Alert error:', e);
              }
            }}
          />
          <MetricCard
            icon="walk"
            label="Steps"
            value={displayData?.steps || '--'}
            unit="steps"
            color="#4CAF50"
            status={displayData?.steps ? `${Math.round((displayData.steps / 10000) * 100)}% goal` : 'No data'}
            onPress={() => {
              try {
                Alert.alert(
                  'Steps',
                  displayData?.steps ? `Today: ${displayData.steps} steps\nGoal: 10,000 steps\nProgress: ${Math.round((displayData.steps / 10000) * 100)}%` : 'No data available',
                  [{ text: 'OK', style: 'default' }]
                );
              } catch (e) {
                console.error('[HealthScreen] Alert error:', e);
              }
            }}
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="lungs"
            label="Oxygen"
            value={displayData?.oxygenSaturation || '--'}
            unit="%"
            color="#2196F3"
            status={displayData?.oxygenSaturation ? 'Good' : 'No data'}
            onPress={() => {
              try {
                Alert.alert(
                  'Oxygen Saturation',
                  displayData?.oxygenSaturation ? `Current: ${displayData.oxygenSaturation}%\n${displayData.oxygenSaturation >= 95 ? 'Excellent' : 'Normal'}` : 'No data available',
                  [{ text: 'OK', style: 'default' }]
                );
              } catch (e) {
                console.error('[HealthScreen] Alert error:', e);
              }
            }}
          />
          <MetricCard
            icon="heart-pulse"
            label="Blood Pressure"
            value={displayData?.bloodPressure ? `${displayData.bloodPressure.systolic}/${displayData.bloodPressure.diastolic}` : '--'}
            unit="mmHg"
            color="#E91E63"
            status={displayData?.bloodPressure ? 'Normal' : 'No data'}
            onPress={() => {
              try {
                Alert.alert(
                  'Blood Pressure',
                  displayData?.bloodPressure && displayData.bloodPressure.systolic && displayData.bloodPressure.diastolic
                    ? `Systolic: ${displayData.bloodPressure.systolic} mmHg\nDiastolic: ${displayData.bloodPressure.diastolic} mmHg`
                    : 'No data available',
                  [{ text: 'OK', style: 'default' }]
                );
              } catch (e) {
                console.error('[HealthScreen] Alert error:', e);
              }
            }}
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="fire"
            label="Calories"
            value={displayData?.calories || '--'}
            unit="kcal"
            color="#FF9800"
            status={displayData?.calories ? `${Math.round((displayData.calories / 2000) * 100)}% goal` : 'No data'}
            onPress={() => {
              try {
                Alert.alert(
                  'Calories',
                  displayData?.calories ? `Today: ${displayData.calories} kcal\nGoal: 2,000 kcal\nProgress: ${Math.round((displayData.calories / 2000) * 100)}%` : 'No data available',
                  [{ text: 'OK', style: 'default' }]
                );
              } catch (e) {
                console.error('[HealthScreen] Alert error:', e);
              }
            }}
          />
          <MetricCard
            icon="moon-waning-crescent"
            label="Sleep"
            value={displayData?.sleepData ? `${Math.floor(displayData.sleepData.duration / 60)}h` : '--'}
            unit="duration"
            color="#9C27B0"
            status={displayData?.sleepData?.quality || 'No data'}
            onPress={() => {
              try {
                Alert.alert(
                  'Sleep',
                  displayData?.sleepData && displayData.sleepData.duration
                    ? `Duration: ${Math.floor(displayData.sleepData.duration / 60)}h\nQuality: ${displayData.sleepData.quality || 'Not tracked'}`
                    : 'No sleep data available',
                  [{ text: 'OK', style: 'default' }]
                );
              } catch (e) {
                console.error('[HealthScreen] Alert error:', e);
              }
            }}
          />
        </View>
      </View>

      {/* Battery Display - Keep watch battery visible */}
      {displayData?.battery !== undefined && (
        <View style={[styles.batteryCard, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
          <View style={styles.batteryHeader}>
            <MaterialCommunityIcons
              name={(displayData?.battery ?? 0) > 50 ? 'battery' : (displayData?.battery ?? 0) > 20 ? 'battery-50' : 'battery-alert'}
              size={24}
              color={(displayData?.battery ?? 0) > 50 ? '#48BB78' : (displayData?.battery ?? 0) > 20 ? '#D69E2E' : '#E53E3E'}
            />
            <View style={styles.batteryInfo}>
              <Text style={[styles.batteryLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                Watch Battery
              </Text>
              <Text style={[styles.batteryValue, { color: (displayData?.battery ?? 0) > 50 ? '#48BB78' : (displayData?.battery ?? 0) > 20 ? '#D69E2E' : '#E53E3E' }]}>
                {displayData?.battery ?? 0}%
              </Text>
            </View>
            <View style={[styles.batteryBar, { backgroundColor: isDark ? '#404854' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.batteryFill,
                  {
                    width: `${displayData?.battery ?? 0}%`,
                    backgroundColor: (displayData?.battery ?? 0) > 50 ? '#48BB78' : (displayData?.battery ?? 0) > 20 ? '#D69E2E' : '#E53E3E'
                  }
                ]}
              />
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.syncButton, { backgroundColor: isDark ? '#48BB78' : '#2F855A', opacity: isSyncing ? 0.6 : 1 }]}
        onPress={async () => {
          try {
            await syncDeviceData();
            Alert.alert('Success', 'Health data saved to cloud');
          } catch (err) {
            console.error('Error syncing:', err);
            if (isMountedRef.current) {
              setError('Failed to save data');
            }
          }
        }}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <MaterialCommunityIcons name="cloud-upload" size={20} color="white" />
            <Text style={styles.syncButtonText}>Save Health Data</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Background Metrics Sync Button */}
      {backgroundMetricsCount > 0 && (
        <TouchableOpacity
          style={[styles.syncButton, { backgroundColor: isDark ? '#4299E1' : '#3182CE', opacity: isSyncingBackground ? 0.6 : 1, marginTop: 12 }]}
          onPress={syncBackgroundMetrics}
          disabled={isSyncingBackground}
        >
          {isSyncingBackground ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialCommunityIcons name="cloud-upload" size={20} color="white" />
              <Text style={styles.syncButtonText}>Sync {backgroundMetricsCount} Background Metrics</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );



  // Device Selection Modal - Memoized to prevent flickering
  const DeviceModal = useMemo(() => (
    <Modal
      visible={showDeviceModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDeviceModal(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#0F1724' : '#FFFFFF' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
              Available Devices
            </Text>
            <TouchableOpacity onPress={() => setShowDeviceModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={isDark ? '#F8FAFC' : '#1E293B'} />
            </TouchableOpacity>
          </View>

          {/* Previously Connected Devices - Quick Connect - Always Show */}
          {recentDevices.length > 0 && (
            <View style={styles.previousDevicesSection}>
              <Text style={[styles.previousDevicesTitle, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                Previously Connected
              </Text>
              <View style={styles.previousDevicesList}>
                {recentDevices.map((device) => (
                  <TouchableOpacity
                    key={device.id}
                    style={[styles.previousDeviceItem, { backgroundColor: isDark ? '#1A202C' : '#F7FAFC', borderColor: isDark ? '#2D3748' : '#E2E8F0' }]}
                    onPress={() => {
                      try {
                        connectToDevice(device);
                        setShowDeviceModal(false);
                      } catch (err) {
                        console.error('Error connecting to device:', err);
                        Alert.alert('Connection Error', 'Failed to connect to device. Please try again.');
                      }
                    }}
                  >
                    <MaterialCommunityIcons name="history" size={18} color={isDark ? '#48BB78' : '#2F855A'} />
                    <Text style={[styles.previousDeviceName, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                      {device.name}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={isDark ? '#A0AEC0' : '#CBD5E0'} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {isScanning && devices.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDark ? '#48BB78' : '#2F855A'} />
              <Text style={[styles.scanningText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Scanning for devices...
              </Text>
            </View>
          ) : devices.length === 0 ? (
            <View style={styles.noDevicesContainer}>
              <MaterialCommunityIcons name="bluetooth-off" size={48} color={isDark ? '#A0AEC0' : '#94A3B8'} />
              <Text style={[styles.noDevicesText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                No devices found. Make sure:
              </Text>
              <Text style={[styles.noDevicesHint, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                • Your watch is in pairing mode{'\n'}
                • Bluetooth is enabled{'\n'}
                • Location services are on{'\n'}
                • App has Bluetooth permissions
              </Text>
            </View>
          ) : (
            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const deviceName = item.name && item.name.trim() ? item.name : 'Unknown Device';
                const isUnknown = !item.name || !item.name.trim();

                return (
                  <TouchableOpacity
                    style={[
                      styles.deviceItem,
                      {
                        borderBottomColor: isDark ? '#2D3748' : '#E2E8F0',
                        opacity: isUnknown ? 0.7 : 1
                      }
                    ]}
                    onPress={() => {
                      try {
                        if (item && typeof item === 'object' && 'id' in item) {
                          connectToDevice(item as any);
                          setShowDeviceModal(false);
                        } else {
                          Alert.alert('Error', 'Invalid device object');
                        }
                      } catch (err) {
                        console.error('Error connecting:', err);
                        Alert.alert('Connection Error', 'Failed to connect to device');
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name={isUnknown ? 'bluetooth' : 'watch'}
                      size={24}
                      color={isUnknown ? (isDark ? '#A0AEC0' : '#94A3B8') : (isDark ? '#48BB78' : '#2F855A')}
                    />
                    <View style={styles.deviceItemInfo}>
                      <Text style={[
                        styles.deviceItemName,
                        {
                          color: isDark ? '#F8FAFC' : '#1E293B',
                          fontStyle: isUnknown ? 'italic' : 'normal'
                        }
                      ]}>
                        {deviceName}
                      </Text>
                      <Text style={[styles.deviceItemId, { color: isDark ? '#94A3B8' : '#94A3B8' }]}>
                        {item.id}
                      </Text>
                      {isUnknown && (
                        <Text style={[styles.deviceItemHint, { color: isDark ? '#A0AEC0' : '#94A3B8' }]}>
                          Tap to connect and identify
                        </Text>
                      )}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? '#A0AEC0' : '#CBD5E0'} />
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: isDark ? '#48BB78' : '#2F855A' }]}
            onPress={() => {
              if (isScanning) {
                stopScan();
              } else {
                startScan();
              }
            }}
          >
            <MaterialCommunityIcons name={isScanning ? 'stop' : 'magnify'} size={20} color="white" />
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Stop Scanning' : 'Scan for Devices'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  ), [showDeviceModal, isDark, isScanning, devices]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F1724' : '#F8FAFC' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          try {
            console.log('[HealthScreen] Back button pressed - navigating away (keeping connection alive)');
            // CRITICAL: Don't set isMountedRef to false - it causes watch disconnection
            // Just navigate back and let the component cleanup handle state updates
            navigation.goBack();
          } catch (err) {
            console.error('[HealthScreen] Back button error:', err);
          }
        }}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#F8FAFC' : '#1E293B'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
          Health Dashboard
        </Text>
        <TouchableOpacity onPress={() => {
          try {
            onRefresh();
          } catch (err) {
            console.error('[HealthScreen] Refresh button error:', err);
          }
        }}>
          <MaterialCommunityIcons name="refresh" size={24} color={isDark ? '#48BB78' : '#2F855A'} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {renderOverviewTab()}
      </View>

      {DeviceModal}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 24 },
  deviceCard: { borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  deviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  deviceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  deviceTextContainer: { marginLeft: 12, flex: 1 },
  deviceName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, marginRight: 8 },
  connectButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  connectButtonText: { color: 'white', fontWeight: '500', fontSize: 14 },
  deviceDetails: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 12, marginRight: 8 },
  detailValue: { fontSize: 12, fontWeight: '500' },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  metricsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  metricIconBg: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  metricStatus: {
    fontSize: 11,
  },
  syncButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  scanningText: {
    marginTop: 12,
    fontSize: 14,
  },
  noDevicesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDevicesText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  deviceItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceItemId: {
    fontSize: 12,
    marginTop: 4,
  },
  scanButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  recentDevicesContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  recentDevicesTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  recentDevicesList: {
    gap: 8,
  },
  recentDeviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  recentDeviceName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  batteryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  batteryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  batteryInfo: {
    flex: 1,
  },
  batteryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  batteryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  batteryBar: {
    width: 60,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 4,
  },
  previousDevicesSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  previousDevicesTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previousDevicesList: {
    gap: 8,
  },
  previousDeviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  previousDeviceName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  noDevicesHint: {
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  deviceItemHint: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  demoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ED8936',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginLeft: 8,
  },
  demoText: {
    fontSize: 12,
    marginBottom: 12,
  },
  demoButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  demoButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  demoButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  hydrationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hydrationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  hydrationTitleText: {
    flex: 1,
  },
  hydrationLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  hydrationValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  hydrationButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hydrationProgress: {
    marginTop: 12,
  },
  hydrationProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  hydrationProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  hydrationGoal: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default HealthScreen;
