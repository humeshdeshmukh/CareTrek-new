// src/screens/Senior/HealthScreen.tsx
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Platform,
  Modal,
  FlatList,
  Button,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/translation/TranslationContext';
import { useCachedTranslation } from '../../hooks/useCachedTranslation';
import { LineChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useBLEWatch } from '../../hooks/useBLEWatch'; // <-- new BLE hook
import { formatDistanceToNow } from 'date-fns';

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

type HealthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Health'>;

// Helper function to get device icon
const getDeviceIcon = (type?: string) => {
  switch (type) {
    case 'miband':
    case 'amazfit':
    case 'firebolt':
      return 'watch-outline';
    default:
      return 'watch-outline';
  }
};

// Simple BLE HTML snippet used in the WebView (kept as-is if you still need a hidden WebView)
const BLE_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script>window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({status:'ready'}));</script></head><body style="display:none"></body></html>`;

// Generate sample chart data (keeps UI working when device data absent)
const generateSampleChartData = () => {
  const labels: string[] = [];
  const data: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    data.push(Math.floor(Math.random() * 5000) + 2000);
  }

  return { labels, data };
};

type HealthScreenProps = NativeStackScreenProps<RootStackParamList, 'Health'>;

const HealthScreen: React.FC<HealthScreenProps> = ({ route, navigation }) => {
  const { isDark } = useTheme();
  const { currentLanguage } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'sleep' | 'settings'>('overview');
  const [showDeviceList, setShowDeviceList] = useState(false);
  
  // Define available device types with display names and icons
  const deviceTypes = [
    { type: 'miband', name: 'Mi Band', icon: 'watch' },
    { type: 'amazfit', name: 'Amazfit', icon: 'watch' },
    { type: 'firebolt', name: 'Firebolt', icon: 'watch' },
    { type: 'generic', name: 'Generic', icon: 'watch' },
  ];

  // Use the BLE hook and get only the properties we need
  const {
    watchData = { status: 'disconnected' },
    devices = [],
    isScanning = false,
    selectedDeviceType = 'generic',
    setSelectedDeviceType = () => {},
    syncDeviceData = async () => ({}),
    disconnectDevice = () => {},
    isSyncing = false,
    lastSync = null,
    syncError = null,
    startScan = () => {},
    stopScan = () => {},
    connectToDevice = () => {},
    // Add syncToSupabase so HealthScreen can call server sync directly
    syncToSupabase = async () => ({ success: false, error: 'Not implemented' }),
    webViewRef = { current: null },
    handleMessage = () => {},
    handleError = () => {},
    handleWebViewLoad = () => {}
  } = useBLEWatch();

  // DEBUG: log watchData each time it updates
  useEffect(() => {
    console.log('Watch data updated:', watchData);
  }, [watchData]);

  // Translations (fallback to static strings if translation keys missing)
  const { translatedText: healthOverviewText = 'Health Overview' } = useCachedTranslation('Health Overview', currentLanguage);
  const { translatedText: backText = 'Back' } = useCachedTranslation('Back', currentLanguage);
  const { translatedText: heartRateText = 'Heart Rate' } = useCachedTranslation('Heart Rate', currentLanguage);
  const { translatedText: stepsText = 'Steps' } = useCachedTranslation('Steps', currentLanguage);
  const { translatedText: batteryText = 'Battery' } = useCachedTranslation('Battery', currentLanguage);
  const { translatedText: lastUpdatedText = 'Last updated' } = useCachedTranslation('Last updated', currentLanguage);
  const { translatedText: statusText = 'Status' } = useCachedTranslation('Status', currentLanguage);
  const { translatedText: oxygenText = 'Oxygen' } = useCachedTranslation('Oxygen', currentLanguage);
  const { translatedText: bloodPressureText = 'Blood Pressure' } = useCachedTranslation('Blood Pressure', currentLanguage);
  const { translatedText: caloriesText = 'Calories' } = useCachedTranslation('Calories', currentLanguage);
  const { translatedText: distanceText = 'Distance' } = useCachedTranslation('Distance', currentLanguage);
  const { translatedText: sleepText = 'Sleep' } = useCachedTranslation('Sleep', currentLanguage);
  const { translatedText: activityText = 'Activity' } = useCachedTranslation('Activity', currentLanguage);
  const { translatedText: settingsText = 'Settings' } = useCachedTranslation('Settings', currentLanguage);
  const { translatedText: connectText = 'Connect' } = useCachedTranslation('Connect', currentLanguage);
  const { translatedText: disconnectText = 'Disconnect' } = useCachedTranslation('Disconnect', currentLanguage);
  const { translatedText: syncText = 'Sync' } = useCachedTranslation('Sync', currentLanguage);
  const { translatedText: deviceText = 'Device' } = useCachedTranslation('Device', currentLanguage);
  const { translatedText: firmwareText = 'Firmware' } = useCachedTranslation('Firmware', currentLanguage);
  const { translatedText: hardwareText = 'Hardware' } = useCachedTranslation('Hardware', currentLanguage);
  const { translatedText: signalStrengthText = 'Signal' } = useCachedTranslation('Signal', currentLanguage);
  const typeText = 'Type';

  // Sample chart data
  const chartData = useMemo(() => generateSampleChartData(), []);

  // Utility: get status color
  const getStatusColor = () => {
    switch (watchData?.status) {
      case 'connected':
        if (watchData?.rssi) {
          if (watchData.rssi >= -60) return '#48BB78';
          if (watchData.rssi >= -80) return '#D69E2E';
          return '#E53E3E';
        }
        return '#48BB78';
      case 'connecting':
        return '#D69E2E';
      case 'disconnected':
        return '#E53E3E';
      default:
        return '#A0AEC0';
    }
  };

  const formatLastUpdated = () => {
    if (!watchData?.lastUpdated) return '';
    try {
      return dayjs(watchData.lastUpdated).fromNow();
    } catch {
      return '';
    }
  };

  const getSignalStrength = () => {
    if (!watchData?.rssi && watchData?.rssi !== 0) return null;

    let level = 0;
    let icon: string = 'signal-cellular-outline';

    if (watchData.rssi >= -60) {
      level = 4;
      icon = 'cellular';
    } else if (watchData.rssi >= -70) {
      level = 3;
      icon = 'cellular';
    } else if (watchData.rssi >= -80) {
      level = 2;
      icon = 'cellular';
    } else {
      level = 1;
      icon = 'cellular';
    }

    return {
      level,
      icon,
      text: `${Math.abs(watchData.rssi)} dBm`,
      color: getStatusColor()
    };
  };

  const signalStrength = getSignalStrength();

  const handleBack = () => navigation.goBack();

  // Update the onRefresh function to use the new syncDeviceData
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (typeof syncDeviceData === 'function') {
      syncDeviceData()
        .catch(() => {})
        .finally(() => setRefreshing(false));
    } else {
      setTimeout(() => setRefreshing(false), 800);
    }
  }, [syncDeviceData]);

  // Update the handleConnectPress function
  const handleConnectPress = useCallback(() => {
    if (watchData?.status === 'connected') {
      if (typeof disconnectDevice === 'function') disconnectDevice();
    } else {
      setShowDeviceList(true);
      if (typeof startScan === 'function') startScan();
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [watchData?.status, disconnectDevice, startScan]);

  // Update the handleDeviceSelect function
  const handleDeviceSelect = useCallback((device: any) => {
    setShowDeviceList(false);
    if (typeof connectToDevice === 'function') connectToDevice(device);
  }, [connectToDevice]);

  const handleDeviceTypeChange = (type: any) => {
    if (typeof setSelectedDeviceType === 'function') setSelectedDeviceType(type);
    if (watchData?.status === 'connected' && typeof connectToDevice === 'function') {
      connectToDevice(type);
    }
  };

  const retryConnection = useCallback(() => {
    try {
      if (webViewRef && (webViewRef as any).current && typeof (webViewRef as any).current.reload === 'function') {
        (webViewRef as any).current.reload();
      }
    } catch (e) {
      // swallow
    }
  }, [webViewRef]);

  // HealthMetric component
  interface HealthMetricProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: string;
    color: string;
    isLoading?: boolean;
    onPress?: () => void;
    iconType?: 'ionicons' | 'material' | 'material-community' | 'font-awesome';
    iconSize?: number;
  }

  const HealthMetric: React.FC<HealthMetricProps> = React.memo(({
    title,
    value,
    unit = '',
    icon,
    color,
    isLoading = false,
    onPress,
    iconType = 'ionicons',
    iconSize = 24
  }) => {
    const content = (
      <View style={[styles.metricCard, {
        backgroundColor: isDark ? '#2D3748' : '#FFFFFF',
        opacity: isLoading ? 0.7 : 1
      }]}>
        <View style={[styles.metricIcon, { backgroundColor: (color || '#000') + (isDark ? '33' : '1A') }]}>
          {iconType === 'material' ? (
            <MaterialIcons name={icon as any} size={iconSize} color={color} />
          ) : iconType === 'material-community' ? (
            <MaterialCommunityIcons name={icon as any} size={iconSize} color={color} />
          ) : iconType === 'font-awesome' ? (
            <FontAwesome5 name={icon as any} size={iconSize} color={color} />
          ) : (
            <Ionicons name={icon as any} size={iconSize} color={color} />
          )}
        </View>

        <View style={styles.metricTextContainer}>
          <Text style={[styles.metricTitle, { color: isDark ? '#A0AEC0' : '#4A5568' }]}>{title}</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={isDark ? '#E2E8F0' : '#1A202C'} />
          ) : (
            <Text style={[styles.metricValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {value} <Text style={[styles.metricUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>{unit}</Text>
            </Text>
          )}
        </View>
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={isLoading}>
          {content}
        </TouchableOpacity>
      );
    }
    return content;
  });

  // Handle sync press: first refresh local device data, then attempt to push to Supabase
  const handleSyncPress = useCallback(async () => {
    try {
      // Step 1: refresh local readable characteristics
      let localResult: any = { success: true };
      if (typeof syncDeviceData === 'function') {
        localResult = await syncDeviceData();
      }

      // Step 2: if connected, push to Supabase using syncToSupabase
      if (watchData?.status === 'connected' && typeof syncToSupabase === 'function') {
        const serverResult = await syncToSupabase();
        if (serverResult?.success) {
          Alert.alert('Success', 'Data synced successfully!');
        } else {
          Alert.alert('Sync Error', serverResult?.error || 'Failed to sync to server');
        }
        return;
      }

      if (!watchData || watchData.status !== 'connected') {
        Alert.alert('Not connected', 'Please connect a device before syncing.');
        return;
      }

      if (!localResult?.success) {
        Alert.alert('Error', localResult?.error || 'Failed to read local device data');
        return;
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      Alert.alert('Error', error?.message || 'An error occurred while syncing');
    }
  }, [syncDeviceData, syncToSupabase, watchData]);

  // Sync status renderer with sync button
  const renderSyncStatus = () => {
    return (
      <View style={{ marginTop: 12, width: '100%' }}>
        <Button
          title={isSyncing ? "Syncing..." : "Sync Now"}
          onPress={handleSyncPress}
          disabled={isSyncing}
          color={isDark ? '#4FD1C5' : undefined}
        />
        {!isSyncing && syncError && (
          <Text style={{ color: '#FF3B30', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            Sync failed: {syncError}
          </Text>
        )}
        {!isSyncing && lastSync && (
          <Text style={{ 
            color: isDark ? '#A0AEC0' : '#666', 
            fontSize: 12, 
            marginTop: 4,
            textAlign: 'center'
          }}>
            Last synced {formatDistanceToNow(lastSync, { addSuffix: true })}
          </Text>
        )}
      </View>
    );
  };

  // If connecting show loading
  if (watchData?.status === 'connecting') {
    return (
      <View style={[styles.container, {
        backgroundColor: isDark ? '#171923' : '#FFFBEF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }]}>
        <ActivityIndicator size="large" color={isDark ? '#4FD1C5' : '#2C7A7B'} />
        <Text style={{
          marginTop: 16,
          color: isDark ? '#E2E8F0' : '#1A202C',
          fontSize: 16,
          textAlign: 'center'
        }}>
          {`Connecting to ${watchData?.deviceName || 'device'}...`}
        </Text>
        {signalStrength && (
          <View style={[styles.signalStrength, { marginTop: 16 }]}>
            <Ionicons name={signalStrength.icon as any} size={20} color={signalStrength.color} style={{ marginRight: 4 }} />
            <Text style={{ color: isDark ? '#E2E8F0' : '#1A202C', fontSize: 14 }}>{signalStrength.text}</Text>
          </View>
        )}
      </View>
    );
  }

  // Render overview tab
  const renderOverviewTab = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4FD1C5']} tintColor={isDark ? '#4FD1C5' : '#2C7A7B'} />
      }
    >
      <View style={[styles.deviceCard, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <Ionicons name={getDeviceIcon(watchData?.deviceType as any) as any} size={24} color={isDark ? '#4FD1C5' : '#2C7A7B'} />
            <View style={styles.deviceTextContainer}>
              <Text style={[styles.deviceName, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData?.deviceName || 'Not Connected'}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.statusText, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                  {watchData?.status === 'connected' ? 'Connected' : watchData?.status === 'disconnected' ? 'Disconnected' : 'Connecting'}
                </Text>

                {signalStrength && watchData?.status === 'connected' && (
                  <View style={styles.signalStrength}>
                    <Ionicons name={signalStrength.icon as any} size={14} color={signalStrength.color} style={{ marginRight: 2 }} />
                    <Text style={{ color: isDark ? '#A0AEC0' : '#718096', fontSize: 12 }}>{signalStrength.text}</Text>
                  </View>
                )}
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
            <Text style={styles.connectButtonText}>{watchData?.status === 'connected' ? disconnectText : connectText}</Text>
          </TouchableOpacity>
        </View>

        {watchData?.status === 'connected' && (
          <View style={styles.deviceDetails}>
            {watchData?.firmwareVersion && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>{firmwareText}:</Text>
                <Text style={[styles.detailValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.firmwareVersion}</Text>
              </View>
            )}
            {watchData?.hardwareVersion && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>{hardwareText}:</Text>
                <Text style={[styles.detailValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.hardwareVersion}</Text>
              </View>
            )}
            {watchData?.lastUpdated && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>{lastUpdatedText}:</Text>
                <Text style={[styles.detailValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{formatLastUpdated()}</Text>
              </View>
            )}

            {/* Sync status appears under device details */}
            {renderSyncStatus()}

          </View>
        )}
      </View>

{/* Health Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          <HealthMetric
            title={heartRateText}
            value={watchData?.heartRate ? watchData.heartRate.toString() : '--'}
            unit="bpm"
            icon="heart"
            color="#F56565"
            isLoading={watchData?.status === 'connecting'}
            iconType="font-awesome"
            iconSize={20}
          />

          <HealthMetric
            title={stepsText}
            value={watchData?.steps ? watchData.steps.toLocaleString() : '--'}
            unit=""
            icon="walk"
            color="#9F7AEA"
            isLoading={watchData?.status === 'connecting'}
            iconType="ionicons"
            iconSize={20}
          />
        </View>

        <View style={styles.metricsRow}>
          <HealthMetric
            title={oxygenText}
            value={watchData?.oxygenSaturation ? watchData.oxygenSaturation.toString() : '--'}
            unit="%"
            icon="air-humidifier"
            color="#4299E1"
            isLoading={watchData?.status === 'connecting'}
            iconType="material-community"
            iconSize={20}
          />

          <HealthMetric
            title={bloodPressureText}
            value={watchData?.bloodPressure ? `${watchData.bloodPressure.systolic}/${watchData.bloodPressure.diastolic}` : '--/--'}
            unit="mmHg"
            icon="blood-bag"
            color="#ED8936"
            isLoading={watchData?.status === 'connecting'}
            iconType="material-community"
            iconSize={20}
          />
        </View>

        <View style={styles.metricsRow}>
          <HealthMetric
            title={batteryText}
            value={watchData?.battery ? watchData.battery.toString() : '--'}
            unit="%"
            icon="battery"
            color={watchData?.battery && watchData.battery < 20 ? '#F56565' : '#48BB78'}
            isLoading={watchData?.status === 'connecting'}
            iconType="material-community"
            iconSize={20}
          />

          <HealthMetric
            title={caloriesText}
            value={watchData?.calories ? watchData.calories.toString() : '--'}
            unit="kcal"
            icon="fire"
            color="#ED8936"
            isLoading={watchData?.status === 'connecting'}
            iconType="material-community"
            iconSize={20}
          />
        </View>
      </View>

      {/* Activity Chart */}
      <View style={[styles.chartContainer, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{stepsText} {activityText}</Text>
          <TouchableOpacity onPress={() => setActiveTab('activity')}>
            <Text style={{ color: isDark ? '#4FD1C5' : '#2C7A7B', fontSize: 12 }}>View All</Text>
          </TouchableOpacity>
        </View>

        <LineChart
          data={{
            labels: chartData.labels,
            datasets: [{ data: chartData.data, color: (opacity = 1) => (isDark ? `rgba(79, 209, 197, ${opacity})` : `rgba(44, 122, 123, ${opacity})`), strokeWidth: 2 }]
          }}
          width={CHART_WIDTH}
          height={200}
          chartConfig={{
            backgroundColor: isDark ? '#2D3748' : '#FFFFFF',
            backgroundGradientFrom: isDark ? '#2D3748' : '#FFFFFF',
            backgroundGradientTo: isDark ? '#2D3748' : '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => (isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
            labelColor: (opacity = 1) => (isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
            style: { borderRadius: 8 },
            propsForDots: { r: '3', strokeWidth: '1', stroke: isDark ? '#4FD1C5' : '#2C7A7B', fill: isDark ? '#1A202C' : '#FFFFFF' },
            propsForBackgroundLines: { stroke: isDark ? 'rgba(160, 174, 192, 0.2)' : 'rgba(113, 128, 150, 0.2)' },
            fillShadowGradient: isDark ? '#4FD1C5' : '#2C7A7B',
            fillShadowGradientOpacity: 0.1,
            strokeWidth: 1,
            barPercentage: 0.5,
            useShadowColorFromDataset: false
          }}
          bezier
          style={styles.chart}
          withDots
          withInnerLines
          withOuterLines
          fromZero
          segments={4}
        />
      </View>

      {/* Sleep Summary */}
      {watchData?.sleepData && (
        <TouchableOpacity style={[styles.sleepCard, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]} onPress={() => setActiveTab('sleep')}>
          <View style={styles.sleepHeader}>
            <Ionicons name="moon" size={20} color={isDark ? '#4FD1C5' : '#2C7A7B'} />
            <Text style={[styles.sleepTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{sleepText} {activityText}</Text>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#A0AEC0' : '#718096'} style={{ marginLeft: 'auto' }} />
          </View>

          <View style={styles.sleepStats}>
            <View style={styles.sleepStat}>
              <Text style={[styles.sleepStatValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.sleepData ? Math.floor(watchData.sleepData.deepSleep / 60) : '--'}</Text>
              <Text style={[styles.sleepStatLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Deep</Text>
            </View>
            <View style={styles.sleepStat}>
              <Text style={[styles.sleepStatValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.sleepData ? Math.floor(watchData.sleepData.lightSleep / 60) : '--'}</Text>
              <Text style={[styles.sleepStatLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Light</Text>
            </View>
            <View style={styles.sleepStat}>
              <Text style={[styles.sleepStatValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.sleepData ? Math.floor(watchData.sleepData.remSleep / 60) : '--'}</Text>
              <Text style={[styles.sleepStatLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>REM</Text>
            </View>
            <View style={styles.sleepStat}>
              <Text style={[styles.sleepStatValue, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{watchData.sleepData ? Math.floor(watchData.sleepData.awake / 60) : '--'}</Text>
              <Text style={[styles.sleepStatLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Awake</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.syncButton, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]} onPress={() => typeof syncDeviceData === 'function' && syncDeviceData()} disabled={watchData?.status !== 'connected'}>
        <Ionicons name="sync" size={20} color={watchData?.status === 'connected' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#4A5568' : '#CBD5E0')} style={{ marginRight: 8 }} />
        <Text style={[styles.syncButtonText, { color: watchData?.status === 'connected' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#4A5568' : '#CBD5E0') }]}>{syncText}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderActivityTab = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: isDark ? '#E2E8F0' : '#1A202C', fontSize: 16 }}>Activity tab content will go here</Text>
    </View>
  );

  const renderSleepTab = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: isDark ? '#E2E8F0' : '#1A202C', fontSize: 16 }}>Sleep tab content will go here</Text>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.sectionHeader, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{deviceText} {settingsText}</Text>

      <View style={[styles.settingItem, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
        <Text style={[styles.settingLabel, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{deviceText} {typeText}</Text>
      </View>

      <View style={[styles.settingItem, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
        <Text style={[styles.settingLabel, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Notifications</Text>
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#A0AEC0' : '#718096'} />
      </View>

      <View style={[styles.settingItem, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
        <Text style={[styles.settingLabel, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Export Data</Text>
        <Ionicons name="download-outline" size={20} color={isDark ? '#A0AEC0' : '#718096'} />
      </View>

      <View style={[styles.settingItem, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
        <Text style={[styles.settingLabel, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>About</Text>
        <Ionicons name="information-circle-outline" size={20} color={isDark ? '#A0AEC0' : '#718096'} />
      </View>

      {/* Device type selector */}
      <View style={{ marginTop: 12 }}>
        <Text style={{ marginBottom: 8, color: isDark ? '#A0AEC0' : '#718096' }}>{typeText}</Text>
        <View style={styles.deviceTypeSelector}>
          {(deviceTypes || []).map((device: any) => (
            <TouchableOpacity
              key={device.type}
              style={[
                styles.deviceTypeButton,
                selectedDeviceType === device.type && {
                  backgroundColor: isDark ? '#4FD1C5' : '#2C7A7B',
                  borderColor: isDark ? '#4FD1C5' : '#2C7A7B'
                }
              ]}
              onPress={() => handleDeviceTypeChange(device.type)}
            >
              <Text style={[styles.deviceTypeButtonText, selectedDeviceType === device.type ? { color: '#FFFFFF' } : { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{device.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'activity': return renderActivityTab();
      case 'sleep': return renderSleepTab();
      case 'settings': return renderSettingsTab();
      case 'overview':
      default: return renderOverviewTab();
    }
  };

  // Device list modal (new layout)
  const renderDeviceListModal = () => (
    <Modal
      visible={showDeviceList}
      animationType="slide"
      transparent
      onRequestClose={() => setShowDeviceList(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#0f1724' : '#FFFFFF' }]}>

          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              Available Devices
            </Text>

            {/* Scan / Stop button inserted into modal header */}
            <View style={{ marginLeft: 8 }}>
              <Button
                title={isScanning ? 'Scanning...' : 'Scan for Devices'}
                onPress={() => {
                  if (isScanning) {
                    stopScan && stopScan();
                  } else {
                    startScan && startScan();
                  }
                }}
                disabled={isScanning}
                color={isDark ? '#4FD1C5' : '#007AFF'}
              />
            </View>

            <TouchableOpacity onPress={() => setShowDeviceList(false)} style={{ marginLeft: 12 }}>
              <Ionicons name="close" size={24} color={isDark ? '#E2E8F0' : '#1A202C'} />
            </TouchableOpacity>
          </View>

          {isScanning && devices.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDark ? '#4FD1C5' : '#2C7A7B'} />
              <Text style={{ marginTop: 10, color: isDark ? '#E2E8F0' : '#1A202C' }}>
                Scanning for devices...
              </Text>
            </View>
          ) : devices.length === 0 ? (
            <View style={styles.noDevicesContainer}>
              <Ionicons name="bluetooth" size={48} color={isDark ? '#A0AEC0' : '#718096'} />
              <Text style={{ marginTop: 16, color: isDark ? '#A0AEC0' : '#718096', textAlign: 'center' }}>
                No devices found. Make sure your watch is in pairing mode.
              </Text>
            </View>
          ) : (
            <FlatList
              data={devices}
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  style={[styles.deviceItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.03)' : '#EEE' }]}
                  onPress={() => handleDeviceSelect(item)}
                >
                  <Ionicons name="watch" size={20} color={isDark ? '#4FD1C5' : '#2C7A7B'} />
                  <View style={styles.deviceInfo}>
                    <Text style={{ color: isDark ? '#E2E8F0' : '#1A202C' }}>{item.name || 'Unknown Device'}</Text>
                    <Text style={[styles.deviceId, { color: isDark ? '#A0AEC0' : '#718096' }]}>{item.id}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? '#A0AEC0' : '#718096'} />
                </TouchableOpacity>
              )}
            />
          )}

        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#E2E8F0' : '#1A202C'} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{healthOverviewText}</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color={isDark ? '#E2E8F0' : '#1A202C'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'overview' && [styles.activeTab, { borderBottomColor: isDark ? '#4FD1C5' : '#2C7A7B' }]]} onPress={() => setActiveTab('overview')}>
            <Ionicons name="pulse" size={20} color={activeTab === 'overview' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#A0AEC0' : '#718096')} />
            <Text style={[styles.tabText, { color: activeTab === 'overview' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#A0AEC0' : '#718096') }]}>Overview</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tab, activeTab === 'activity' && [styles.activeTab, { borderBottomColor: isDark ? '#4FD1C5' : '#2C7A7B' }]]} onPress={() => setActiveTab('activity')}>
            <Ionicons name="walk" size={20} color={activeTab === 'activity' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#A0AEC0' : '#718096')} />
            <Text style={[styles.tabText, { color: activeTab === 'activity' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#A0AEC0' : '#718096') }]}>{activityText}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tab, activeTab === 'sleep' && [styles.activeTab, { borderBottomColor: isDark ? '#4FD1C5' : '#2C7A7B' }]]} onPress={() => setActiveTab('sleep')}>
            <Ionicons name="moon" size={20} color={activeTab === 'sleep' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#A0AEC0' : '#718096')} />
            <Text style={[styles.tabText, { color: activeTab === 'sleep' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#A0AEC0' : '#718096') }]}>{sleepText}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tab, activeTab === 'settings' && [styles.activeTab, { borderBottomColor: isDark ? '#4FD1C5' : '#2C7A7B' }]]} onPress={() => setActiveTab('settings')}>
            <Ionicons name="settings" size={20} color={activeTab === 'settings' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#A0AEC0' : '#718096')} />
            <Text style={[styles.tabText, { color: activeTab === 'settings' ? (isDark ? '#4FD1C5' : '#2C7A7B') : (isDark ? '#A0AEC0' : '#718096') }]}>{settingsText}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>{renderContent()}</View>

      {/* Hidden WebView for BLE if your hook still expects it */}
      <View style={styles.webviewContainer}>
        {/* Keep WebView if your useBLEWatch expects message events from a hidden webview.
            If not needed you can safely remove this block. */}
      </View>

      {renderDeviceListModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  hiddenWebView: { flex: 0, width: 0, height: 0, opacity: 0 },
  header: {
    paddingTop: 8,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8
  },
  backButton: { padding: 4, marginRight: 8 },
  headerActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' },
  refreshButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  tabsContainer: { flexDirection: 'row', marginTop: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomWidth: 2 },
  tabText: { marginLeft: 6, fontSize: 14, fontWeight: '500' },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  // device card
  deviceCard: { borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  deviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  deviceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  deviceTextContainer: { marginLeft: 12, flex: 1 },
  deviceName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, marginRight: 8 },
  signalStrength: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  connectButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  connectButtonText: { color: 'white', fontWeight: '500', fontSize: 14 },
  deviceDetails: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 12, marginRight: 8 },
  detailValue: { fontSize: 12, fontWeight: '500' },

  // metrics
  metricsGrid: { marginBottom: 16 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metricCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  metricIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  metricTextContainer: { flex: 1 },
  metricTitle: { fontSize: 12, marginBottom: 2, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: 32, fontWeight: 'bold', marginRight: 4 },
  metricUnit: { fontSize: 12, opacity: 0.7 },

  // debug health metric (new)
  healthMetric: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: 4,
  },

  // chart
  chartContainer: { borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartTitle: { fontSize: 16, fontWeight: '600' },
  chart: { marginVertical: 8, borderRadius: 8 },

  // sleep
  sleepCard: { borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  sleepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sleepTitle: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  sleepStats: { flexDirection: 'row', justifyContent: 'space-between' },
  sleepStat: { alignItems: 'center', flex: 1 },
  sleepStatValue: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  sleepStatLabel: { fontSize: 12, opacity: 0.7 },

  // sync
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  syncButtonText: { fontSize: 14, fontWeight: '500' },

  // settings
  sectionHeader: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, opacity: 0.8 },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  settingLabel: { flex: 1, fontSize: 16 },

  deviceTypeSelector: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  deviceTypeButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8, marginBottom: 8 },
  deviceTypeButtonText: { fontSize: 12, fontWeight: '500' },

  // error
  errorContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { marginLeft: 8, fontSize: 14 },

  webviewContainer: { width: 1, height: 1, opacity: 0, position: 'absolute' },

  // modal (new)
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600' },
  scanningIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  scanningText: { marginLeft: 8, fontSize: 14 },
  deviceList: { maxHeight: 300 },
  noDevicesText: { textAlign: 'center', padding: 20, fontSize: 16 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  deviceRssi: { fontSize: 12, marginTop: 2 },
  modalFooter: { marginTop: 20, paddingTop: 15, borderTopWidth: 1 },
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8 },
  scanButtonText: { marginLeft: 8, fontWeight: '500' },

  // new modal styles
  modalDeviceInfo: { flex: 1, marginLeft: 12 },
  deviceId: { fontSize: 12, marginTop: 2 },
  noDevicesContainer: { padding: 32, alignItems: 'center', justifyContent: 'center' },
});

export default HealthScreen;
