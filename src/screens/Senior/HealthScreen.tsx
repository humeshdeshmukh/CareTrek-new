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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useBLEWatch } from '../../hooks/useBLEWatch';
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
    syncDeviceData = async () => ({}),
    disconnectDevice = () => {},
    isSyncing = false,
    startScan = () => {},
    stopScan = () => {},
    connectToDevice = () => {},
  } = useBLEWatch();

  const [activeTab, setActiveTab] = useState<'overview' | 'cardio' | 'activity' | 'wellness'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recentDevices, setRecentDevices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const STORAGE_KEY = 'previouslyConnectedDevices';

  // Save device to AsyncStorage
  const saveDeviceToStorage = useCallback(async (device: any) => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const devices = existing ? JSON.parse(existing) : [];
      
      // Remove if already exists
      const filtered = devices.filter((d: any) => d.id !== device.id);
      
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
      console.error('Error saving device:', err);
    }
  }, []);

  // Load devices from AsyncStorage
  const loadDevicesFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && isMountedRef.current) {
        const devices = JSON.parse(stored);
        setRecentDevices(devices);
      }
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
  }, [loadDevicesFromStorage]);

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

  // Tab Navigation Component
  const TabNavigation = () => (
    <View style={[styles.tabContainer, { backgroundColor: isDark ? '#0F1724' : '#F8FAFC', borderBottomColor: isDark ? '#2D3748' : '#E2E8F0' }]}>
      {[
        { id: 'overview', label: 'Overview', icon: 'view-dashboard' },
        { id: 'cardio', label: 'Cardio', icon: 'heart-pulse' },
        { id: 'activity', label: 'Activity', icon: 'run' },
        { id: 'wellness', label: 'Wellness', icon: 'spa' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && [styles.activeTab, { borderBottomColor: isDark ? '#48BB78' : '#2F855A' }]
          ]}
          onPress={() => setActiveTab(tab.id as any)}
        >
          <MaterialCommunityIcons
            name={tab.icon as any}
            size={20}
            color={activeTab === tab.id ? (isDark ? '#48BB78' : '#2F855A') : (isDark ? '#A0AEC0' : '#94A3B8')}
          />
          <Text style={[
            styles.tabLabel,
            { color: activeTab === tab.id ? (isDark ? '#48BB78' : '#2F855A') : (isDark ? '#A0AEC0' : '#94A3B8') }
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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

  // Metric Card Component
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
  }) => (
    <TouchableOpacity
      style={[styles.metricCard, { backgroundColor: isDark ? '#1A202C' : '#FFFFFF' }]}
      onPress={onPress}
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
            {value}
          </Text>
          <Text style={[styles.metricUnit, { color: isDark ? '#94A3B8' : '#94A3B8' }]}>
            {unit}
          </Text>
        </View>
        <Text style={[styles.metricStatus, { color: isDark ? '#A0AEC0' : '#94A3B8' }]}>
          {status}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={isDark ? '#404854' : '#CBD5E0'}
      />
    </TouchableOpacity>
  );

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
            value={watchData?.heartRate || '--'}
            unit="BPM"
            color="#FF6B6B"
            status={watchData?.heartRate ? 'Normal' : 'No data'}
            onPress={() => navigation.navigate('HeartRate')}
          />
          <MetricCard
            icon="walk"
            label="Steps"
            value={watchData?.steps || '--'}
            unit="steps"
            color="#4CAF50"
            status={watchData?.steps ? `${Math.round((watchData.steps / 10000) * 100)}% goal` : 'No data'}
            onPress={() => navigation.navigate('Steps')}
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="lungs"
            label="Oxygen"
            value={watchData?.oxygenSaturation || '--'}
            unit="%"
            color="#2196F3"
            status={watchData?.oxygenSaturation ? 'Good' : 'No data'}
            onPress={() => navigation.navigate('Oxygen')}
          />
          <MetricCard
            icon="heart-pulse"
            label="Blood Pressure"
            value={watchData?.bloodPressure ? `${watchData.bloodPressure.systolic}/${watchData.bloodPressure.diastolic}` : '--'}
            unit="mmHg"
            color="#E91E63"
            status={watchData?.bloodPressure ? 'Normal' : 'No data'}
            onPress={() => navigation.navigate('BloodPressure')}
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="fire"
            label="Calories"
            value={watchData?.calories || '--'}
            unit="kcal"
            color="#FF9800"
            status={watchData?.calories ? `${Math.round((watchData.calories / 2000) * 100)}% goal` : 'No data'}
            onPress={() => navigation.navigate('Calories')}
          />
          <MetricCard
            icon="moon-waning-crescent"
            label="Sleep"
            value={watchData?.sleepData ? `${Math.floor(watchData.sleepData.duration / 60)}h` : '--'}
            unit="duration"
            color="#9C27B0"
            status={watchData?.sleepData?.quality || 'No data'}
            onPress={() => navigation.navigate('Sleep')}
          />
        </View>

        <MetricCard
          icon="water"
          label="Hydration"
          value={watchData?.hydration?.waterIntake || '--'}
          unit="ml"
          color="#2196F3"
          status={watchData?.hydration ? `${Math.round((watchData.hydration.waterIntake / 2000) * 100)}% goal` : 'No data'}
          onPress={() => navigation.navigate('Hydration')}
        />
      </View>

      {/* Battery Display - Keep watch battery visible */}
      {watchData?.battery !== undefined && (
        <View style={[styles.batteryCard, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
          <View style={styles.batteryHeader}>
            <MaterialCommunityIcons 
              name={watchData.battery > 50 ? 'battery' : watchData.battery > 20 ? 'battery-50' : 'battery-alert'} 
              size={24} 
              color={watchData.battery > 50 ? '#48BB78' : watchData.battery > 20 ? '#D69E2E' : '#E53E3E'} 
            />
            <View style={styles.batteryInfo}>
              <Text style={[styles.batteryLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>
                Watch Battery
              </Text>
              <Text style={[styles.batteryValue, { color: watchData.battery > 50 ? '#48BB78' : watchData.battery > 20 ? '#D69E2E' : '#E53E3E' }]}>
                {watchData.battery}%
              </Text>
            </View>
            <View style={[styles.batteryBar, { backgroundColor: isDark ? '#404854' : '#E2E8F0' }]}>
              <View 
                style={[
                  styles.batteryFill, 
                  { 
                    width: `${watchData.battery}%`,
                    backgroundColor: watchData.battery > 50 ? '#48BB78' : watchData.battery > 20 ? '#D69E2E' : '#E53E3E'
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.syncButton, { backgroundColor: isDark ? '#48BB78' : '#2F855A', opacity: isSyncing ? 0.6 : 1 }]}
        onPress={() => {
          try {
            if (watchData?.status === 'connected') {
              syncDeviceData();
            }
          } catch (err) {
            console.error('Error syncing:', err);
            if (isMountedRef.current) {
              setError('Failed to sync data');
            }
          }
        }}
        disabled={isSyncing || watchData?.status !== 'connected'}
      >
        {isSyncing ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <MaterialCommunityIcons name="sync" size={20} color="white" />
            <Text style={styles.syncButtonText}>Sync All Data</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // Cardio Tab
  const renderCardioTab = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <MetricCard
        icon="heart"
        label="Heart Rate"
        value={watchData?.heartRate || '--'}
        unit="BPM"
        color="#FF6B6B"
        status={watchData?.heartRate ? 'Normal' : 'No data'}
        onPress={() => navigation.navigate('HeartRate')}
      />
      <MetricCard
        icon="heart-pulse"
        label="Blood Pressure"
        value={watchData?.bloodPressure ? `${watchData.bloodPressure.systolic}/${watchData.bloodPressure.diastolic}` : '--'}
        unit="mmHg"
        color="#E91E63"
        status={watchData?.bloodPressure ? 'Normal' : 'No data'}
        onPress={() => navigation.navigate('BloodPressure')}
      />
      <MetricCard
        icon="lungs"
        label="Blood Oxygen"
        value={watchData?.oxygenSaturation || '--'}
        unit="%"
        color="#2196F3"
        status={watchData?.oxygenSaturation ? 'Excellent' : 'No data'}
        onPress={() => navigation.navigate('Oxygen')}
      />
    </ScrollView>
  );

  // Activity Tab
  const renderActivityTab = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <MetricCard
        icon="walk"
        label="Steps"
        value={watchData?.steps || '--'}
        unit="steps"
        color="#4CAF50"
        status={watchData?.steps ? `${Math.round((watchData.steps / 10000) * 100)}% goal` : 'No data'}
        onPress={() => navigation.navigate('Steps')}
      />
      <MetricCard
        icon="fire"
        label="Calories"
        value={watchData?.calories || '--'}
        unit="kcal"
        color="#FF9800"
        status={watchData?.calories ? `${Math.round((watchData.calories / 2000) * 100)}% goal` : 'No data'}
        onPress={() => navigation.navigate('Calories')}
      />
    </ScrollView>
  );

  // Wellness Tab
  const renderWellnessTab = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <MetricCard
        icon="moon-waning-crescent"
        label="Sleep"
        value={watchData?.sleepData ? `${Math.floor(watchData.sleepData.duration / 60)}h` : '--'}
        unit="duration"
        color="#9C27B0"
        status={watchData?.sleepData?.quality || 'No data'}
        onPress={() => navigation.navigate('Sleep')}
      />
      <MetricCard
        icon="water"
        label="Hydration"
        value={watchData?.hydration?.waterIntake || '--'}
        unit="ml"
        color="#2196F3"
        status={watchData?.hydration ? `${Math.round((watchData.hydration.waterIntake / 2000) * 100)}% goal` : 'No data'}
        onPress={() => navigation.navigate('Hydration')}
      />
      <MetricCard
        icon="battery"
        label="Device Battery"
        value={watchData?.battery || '--'}
        unit="%"
        color={watchData?.battery && watchData.battery < 20 ? '#E53E3E' : '#48BB78'}
        status={watchData?.battery && watchData.battery < 20 ? 'Low' : 'Good'}
        onPress={() => {}}
      />
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'cardio':
        return renderCardioTab();
      case 'activity':
        return renderActivityTab();
      case 'wellness':
        return renderWellnessTab();
      default:
        return renderOverviewTab();
    }
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#F8FAFC' : '#1E293B'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
          Health Dashboard
        </Text>
        <TouchableOpacity onPress={() => onRefresh()}>
          <MaterialCommunityIcons name="refresh" size={24} color={isDark ? '#48BB78' : '#2F855A'} />
        </TouchableOpacity>
      </View>

      <TabNavigation />

      <View style={styles.content}>
        {renderContent()}
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
});

export default HealthScreen;
