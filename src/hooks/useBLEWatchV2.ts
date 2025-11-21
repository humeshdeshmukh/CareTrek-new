// src/hooks/useBLEWatchV2.ts
// React hook using ImprovedBLEService with state machine and connection pooling

import { useState, useEffect, useCallback, useRef } from 'react';
import { Device } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Alert, Linking, AppState } from 'react-native';
import * as Location from 'expo-location';
import { DeviceType, WatchData as WatchDataType } from '../types/ble';
import { saveHealthMetrics } from '../services/healthDataService';
import { backgroundDataService } from '../services/backgroundDataService';
import { getLocalHealthDataService } from '../services/localHealthDataService';
import { getCrashPreventionService } from '../services/crashPreventionService';
import { mobileSensorService } from '../services/mobileSensorService';
import { supabase } from '../lib/supabase';
import { getImprovedBLEService, destroyImprovedBLEService, ConnectionState } from '../services/improvedBLEService';
import { Buffer } from 'buffer';

export const useBLEWatchV2 = () => {
  const [watchData, setWatchData] = useState<WatchDataType>({ status: 'disconnected' });
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>('generic');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const bleServiceRef = useRef(getImprovedBLEService({
    maxRetries: 5,
    baseRetryDelay: 1000,
    maxRetryDelay: 30000,
    connectionTimeout: 15000,
    keepAliveInterval: 30000,
  }));

  const isMounted = useRef(true);
  const connectedDeviceRef = useRef<Device | null>(null);
  const monitorsRef = useRef<Array<() => void>>([]);
  const subscribedCharsRef = useRef<Set<string>>(new Set());
  const localHealthServiceRef = useRef(getLocalHealthDataService());
  const crashPreventionRef = useRef(getCrashPreventionService());

  // ========== Sync to Supabase ==========
  const syncToSupabase = useCallback(async (data: WatchDataType) => {
    if (isSyncing) return false;

    if (!data.deviceId) {
      console.warn('[BLE-V2] Skipping sync - no device ID available');
      return false;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('User not authenticated');

      const metricData: WatchDataType = {
        ...data,
        deviceType: data.deviceType || 'generic',
        lastUpdated: data.lastUpdated || new Date(),
        timestamp: new Date().toISOString()
      };

      await saveHealthMetrics(session.user.id, metricData);
      setLastSync(new Date());
      return true;
    } catch (error) {
      console.error('[BLE-V2] Error syncing to Supabase:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to sync data');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // ========== Permissions ==========
  const isAndroid12Plus = () => {
    try {
      return Platform.OS === 'android' && Number(Platform.Version) >= 31;
    } catch {
      return false;
    }
  };

  const getRequiredAndroidPermissions = () => {
    const permissions: any[] = [];
    
    if (isAndroid12Plus()) {
      permissions.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        'android.permission.MANAGE_EXTERNAL_STORAGE'
      );
    } else {
      permissions.push(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
    }
    
    return permissions;
  };

  const checkLocationServicesEnabled = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const enabled = await Location.hasServicesEnabledAsync();
        console.log('[BLE-V2] Location services enabled:', enabled);
        return enabled;
      }
      return true; // iOS handles this differently
    } catch (error) {
      console.warn('[BLE-V2] Error checking location services:', error);
      return false;
    }
  }, []);

  const requestLocationPermission = useCallback(async (forceRequest = false) => {
    if (Platform.OS !== 'android') return true;

    if (!forceRequest && hasLocationPermission === true) return true;

    try {
      // First check if location services are enabled
      const servicesEnabled = await checkLocationServicesEnabled();
      if (!servicesEnabled) {
        console.warn('[BLE-V2] Location services are disabled');
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to scan for Bluetooth devices.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                if (Platform.OS === 'android') {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        setHasLocationPermission(false);
        return false;
      }

      const required = getRequiredAndroidPermissions();
      const currentStatus: Record<string, boolean> = {};

      for (const p of required) {
        try {
          currentStatus[p] = await PermissionsAndroid.check(p as any);
        } catch {
          currentStatus[p] = false;
        }
      }

      const allAlreadyGranted = Object.values(currentStatus).every(Boolean);
      if (allAlreadyGranted) {
        setHasLocationPermission(true);
        return true;
      }

      if (!forceRequest) {
        setHasLocationPermission(false);
        return false;
      }

      const toRequest = required.filter(r => !currentStatus[r]);
      if (toRequest.length === 0) {
        setHasLocationPermission(false);
        return false;
      }

      const granted = await PermissionsAndroid.requestMultiple(toRequest as any);

      let allGranted = true;
      let anyNeverAskAgain = false;
      for (const perm of toRequest) {
        const status = (granted as any)[perm];
        if (status !== PermissionsAndroid.RESULTS.GRANTED) {
          allGranted = false;
          if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) anyNeverAskAgain = true;
        }
      }

      setHasLocationPermission(allGranted);

      if (!allGranted) {
        if (anyNeverAskAgain) {
          Alert.alert(
            'Permissions Required',
            'Some required permissions were permanently denied. Please enable them in app settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      }

      return allGranted;
    } catch (err) {
      console.warn('[BLE-V2] Error checking/requesting permissions:', err);
      setHasLocationPermission(false);
      return false;
    }
  }, [hasLocationPermission, checkLocationServicesEnabled]);

  // ========== Scan ==========
  const startScan = useCallback(async () => {
    if (isScanning) return;

    console.log('[BLE-V2] Starting scan');
    setDevices([]);
    setIsScanning(true);

    try {
      const hasPermission = await requestLocationPermission(true);
      if (!hasPermission) {
        Alert.alert('Permissions Required', 'Location and Bluetooth permissions are required to scan for devices.');
        setIsScanning(false);
        return;
      }

      const bleService = bleServiceRef.current;
      await bleService.startScan(
        (error, device) => {
          if (!isMounted.current) return;
          if (error) {
            const errorMsg = error?.message || String(error);
            console.error('[BLE-V2] Scan error:', errorMsg);
            
            // Check if it's a location services error
            if (errorMsg.includes('Location services are disabled') || 
                errorMsg.includes('location') ||
                errorMsg.includes('Location')) {
              console.warn('[BLE-V2] Location services disabled - prompting user');
              Alert.alert(
                'Location Services Required',
                'Bluetooth scanning requires location services to be enabled. Please enable it in your device settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() }
                ]
              );
            }
            return;
          }
          if (device && device.id) {
            setDevices(prev => {
              // Check if device already in list
              if (prev.some(d => d.id === device.id)) return prev;
              
              // Add new device and sort: paired devices first, then by name
              const updated = [...prev, device];
              updated.sort((a, b) => {
                // Paired devices first (isConnectable = true usually means paired)
                const aIsPaired = a.isConnectable ?? false;
                const bIsPaired = b.isConnectable ?? false;
                if (aIsPaired !== bIsPaired) return bIsPaired ? 1 : -1;
                
                // Then sort by name
                const aName = (a.name ?? a.id).toLowerCase();
                const bName = (b.name ?? b.id).toLowerCase();
                return aName.localeCompare(bName);
              });
              
              return updated;
            });
          }
        },
        10000 // 10 second scan
      );
    } catch (error) {
      console.error('[BLE-V2] startScan error:', error);
      setIsScanning(false);
    }
  }, [isScanning, requestLocationPermission]);

  const stopScan = useCallback(() => {
    bleServiceRef.current.stopScan();
    if (isMounted.current) {
      setIsScanning(false);
    }
  }, []);

  // ========== Connection ==========
  const connectToDevice = useCallback(async (device: Device) => {
    console.log('[BLE-V2] ===== CONNECTION START =====');
    console.log('[BLE-V2] Device:', device.name || device.id);
    
    if (!isMounted.current) {
      console.warn('[BLE-V2] Component unmounted, aborting connection');
      return false;
    }

    try {
      stopScan();
      const bleService = bleServiceRef.current;

      // Step 1: Connect to device
      console.log('[BLE-V2] [STEP 1] Connecting to device...');
      let connectedDevice: Device;
      try {
        connectedDevice = await bleService.connectToDevice(device);
        console.log('[BLE-V2] [STEP 1] ✓ Device connected successfully');
        connectedDeviceRef.current = connectedDevice;
      } catch (connectError) {
        const errorMsg = connectError instanceof Error ? connectError.message : 'Connection failed';
        console.error('[BLE-V2] [STEP 1] ✗ Connection failed:', errorMsg);
        if (isMounted.current) {
          setConnectionError(errorMsg);
          setWatchData(prev => ({
            ...prev,
            status: 'error',
            error: errorMsg,
            lastUpdated: new Date()
          }));
        }
        return false;
      }

      // Step 2: Prepare device info
      console.log('[BLE-V2] [STEP 2] Preparing device info...');
      const deviceName = device.name ?? device.id;
      const deviceId = device.id;
      let deviceType: DeviceType = 'generic';
      const lower = (device.name ?? '').toLowerCase();
      if (lower.includes('mi band') || lower.includes('miband')) deviceType = 'miband';
      else if (lower.includes('amazfit')) deviceType = 'amazfit';
      else if (lower.includes('firebolt')) deviceType = 'firebolt';
      console.log('[BLE-V2] [STEP 2] ✓ Device type:', deviceType);

      // Step 3: Update UI state
      console.log('[BLE-V2] [STEP 3] Updating UI state...');
      if (isMounted.current) {
        setWatchData(prev => ({
          ...prev,
          deviceId,
          deviceName,
          deviceType,
          status: 'connected',
          error: undefined,
          lastUpdated: new Date()
        }));
        console.log('[BLE-V2] [STEP 3] ✓ UI state updated');
      }

      // Step 4: Initialize background data service and mobile sensors
      console.log('[BLE-V2] [STEP 4] Initializing background data service...');
      try {
        await backgroundDataService.initialize(connectedDevice, bleService as any);
        console.log('[BLE-V2] [STEP 4] ✓ Background data service initialized');
      } catch (e) {
        console.error('[BLE-V2] [STEP 4] Background service error:', e);
        // Don't fail connection if background service fails
      }

      // Initialize mobile sensor service (for steps, calories from phone)
      try {
        await mobileSensorService.initialize({
          weight: 70, // Default, can be customized
          height: 170,
          age: 30,
          gender: 'male'
        });
        console.log('[BLE-V2] [STEP 4] ✓ Mobile sensor service initialized');
      } catch (e) {
        console.error('[BLE-V2] [STEP 4] Mobile sensor error:', e);
        // Don't fail connection if mobile sensor fails
      }

      // Step 5: Wait for stability
      console.log('[BLE-V2] [STEP 5] Waiting for stability (500ms)...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[BLE-V2] [STEP 5] ✓ Stability wait complete');

      // Step 6: Subscribe to heart rate
      console.log('[BLE-V2] [STEP 6] Subscribing to heart rate characteristic...');
      try {
        console.log('[BLE-V2] [HR] Monitoring service: 0000180d-0000-1000-8000-00805f9b34fb');
        console.log('[BLE-V2] [HR] Monitoring characteristic: 00002a37-0000-1000-8000-00805f9b34fb');
        
        const hrUnsubscribe = bleService.monitorCharacteristic(
          deviceId,
          '0000180d-0000-1000-8000-00805f9b34fb',
          '00002a37-0000-1000-8000-00805f9b34fb',
          (error, characteristic) => {
            console.log('[BLE-V2] [HR] Callback triggered - error:', !!error, 'characteristic:', !!characteristic);
            
            try {
              if (error) {
                console.error('[BLE-V2] [HR] Monitor error:', error?.message || error);
                return;
              }

              if (!characteristic?.value) {
                console.warn('[BLE-V2] [HR] No characteristic value');
                return;
              }

              if (!isMounted.current) {
                console.warn('[BLE-V2] [HR] Component unmounted, skipping update');
                return;
              }

              try {
                console.log('[BLE-V2] [HR] Raw value:', characteristic.value);
                const buf = Buffer.from(characteristic.value, 'base64');
                console.log('[BLE-V2] [HR] Buffer length:', buf.length);
                
                if (buf.length < 2) {
                  console.warn('[BLE-V2] [HR] Buffer too short:', buf.length);
                  return;
                }

                const flags = buf.readUInt8(0);
                const is16 = (flags & 0x01) !== 0;
                const hr = is16 && buf.length >= 3 ? buf.readUInt16LE(1) : buf.readUInt8(1);

                console.log('[BLE-V2] [HR] Parsed - flags:', flags, 'is16:', is16, 'hr:', hr);

                // Validate range
                if (hr < 30 || hr > 220) {
                  console.warn('[BLE-V2] [HR] Invalid range:', hr);
                  return;
                }

                console.log('[BLE-V2] [HR] ✓ Received valid heart rate:', hr);

                // Update state
                setWatchData(prev => {
                  console.log('[BLE-V2] [HR] Updating state with HR:', hr);
                  return {
                    ...prev,
                    heartRate: hr,
                    lastUpdated: new Date()
                  };
                });

                // Add to background service
                try {
                  backgroundDataService.addHeartRateReading(hr);
                  console.log('[BLE-V2] [HR] Added to background service');
                } catch (e) {
                  console.error('[BLE-V2] [HR] Background service error:', e);
                }

                // Save to local storage
                try {
                  if (localHealthServiceRef.current) {
                    localHealthServiceRef.current.saveMetricImmediately({
                      heartRate: hr,
                      deviceId,
                      deviceName,
                    }).catch(err => {
                      console.error('[BLE-V2] [HR] Storage error:', err);
                    });
                    console.log('[BLE-V2] [HR] Saved to local storage');
                  }
                } catch (e) {
                  console.error('[BLE-V2] [HR] Storage call error:', e);
                }
              } catch (parseErr) {
                console.error('[BLE-V2] [HR] Parse error:', parseErr);
              }
            } catch (err) {
              console.error('[BLE-V2] [HR] Callback error:', err);
            }
          }
        );
        if (hrUnsubscribe) {
          console.log('[BLE-V2] [STEP 6] ✓ Heart rate subscription successful');
          monitorsRef.current.push(hrUnsubscribe);
        } else {
          console.warn('[BLE-V2] [STEP 6] ⚠ Heart rate subscription returned null');
        }
      } catch (hrErr) {
        console.error('[BLE-V2] [STEP 6] ✗ Heart rate subscription error:', hrErr);
      }

      // Step 7: Subscribe to other health metrics (if available)
      console.log('[BLE-V2] [STEP 7] Checking for additional health metrics...');
      
      // Try SpO2 (silently fail if not available)
      try {
        const spo2Unsubscribe = bleService.monitorCharacteristic(
          deviceId,
          '00001822-0000-1000-8000-00805f9b34fb',
          '00002a5f-0000-1000-8000-00805f9b34fb',
          (error, characteristic) => {
            if (error) return; // Silently skip
            try {
              if (!characteristic?.value || !isMounted.current) return;
              const buf = Buffer.from(characteristic.value, 'base64');
              if (buf.length < 1) return;
              const spo2 = buf.readUInt8(0);
              if (spo2 < 50 || spo2 > 100) return;
              console.log('[BLE-V2] [SpO2] Received:', spo2);
              setWatchData(prev => ({ ...prev, oxygenSaturation: spo2, lastUpdated: new Date() }));
              backgroundDataService.addOxygenReading(spo2);
            } catch (err) {
              // Silently skip parse errors
            }
          }
        );
        if (spo2Unsubscribe) {
          monitorsRef.current.push(spo2Unsubscribe);
          console.log('[BLE-V2] [SpO2] ✓ Subscribed');
        }
      } catch (e) {
        // Silently skip
      }

      // Try Blood Pressure (silently fail if not available)
      try {
        const bpUnsubscribe = bleService.monitorCharacteristic(
          deviceId,
          '00001810-0000-1000-8000-00805f9b34fb',
          '00002a35-0000-1000-8000-00805f9b34fb',
          (error, characteristic) => {
            if (error) return; // Silently skip
            try {
              if (!characteristic?.value || !isMounted.current) return;
              const buf = Buffer.from(characteristic.value, 'base64');
              if (buf.length < 4) return;
              const systolic = buf.readUInt16LE(0);
              const diastolic = buf.readUInt16LE(2);
              if (systolic >= 70 && systolic <= 260 && diastolic >= 40 && diastolic <= 200 && systolic > diastolic) {
                console.log('[BLE-V2] [BP] Received:', systolic, '/', diastolic);
                setWatchData(prev => ({ ...prev, bloodPressure: { systolic, diastolic }, lastUpdated: new Date() }));
              }
            } catch (err) {
              // Silently skip parse errors
            }
          }
        );
        if (bpUnsubscribe) {
          monitorsRef.current.push(bpUnsubscribe);
          console.log('[BLE-V2] [BP] ✓ Subscribed');
        }
      } catch (e) {
        // Silently skip
      }

      // Try Steps (silently fail if not available)
      try {
        const stepsUnsubscribe = bleService.monitorCharacteristic(
          deviceId,
          '00001814-0000-1000-8000-00805f9b34fb',
          '00002a22-0000-1000-8000-00805f9b34fb',
          (error, characteristic) => {
            if (error) return; // Silently skip
            try {
              if (!characteristic?.value || !isMounted.current) return;
              const buf = Buffer.from(characteristic.value, 'base64');
              if (buf.length < 4) return;
              const steps = buf.readUInt32LE(0);
              if (steps >= 0 && steps < 1e8) {
                console.log('[BLE-V2] [Steps] Received:', steps);
                setWatchData(prev => ({ ...prev, steps, lastUpdated: new Date() }));
                backgroundDataService.addStepsReading(steps);
              }
            } catch (err) {
              // Silently skip parse errors
            }
          }
        );
        if (stepsUnsubscribe) {
          monitorsRef.current.push(stepsUnsubscribe);
          console.log('[BLE-V2] [Steps] ✓ Subscribed');
        }
      } catch (e) {
        // Silently skip
      }

      // Try Calories (silently fail if not available)
      try {
        const caloriesUnsubscribe = bleService.monitorCharacteristic(
          deviceId,
          '00001814-0000-1000-8000-00805f9b34fb',
          '00002a23-0000-1000-8000-00805f9b34fb',
          (error, characteristic) => {
            if (error) return; // Silently skip
            try {
              if (!characteristic?.value || !isMounted.current) return;
              const buf = Buffer.from(characteristic.value, 'base64');
              if (buf.length < 2) return;
              const calories = buf.readUInt16LE(0);
              if (calories >= 0 && calories < 200000) {
                console.log('[BLE-V2] [Calories] Received:', calories);
                setWatchData(prev => ({ ...prev, calories, lastUpdated: new Date() }));
                backgroundDataService.addCaloriesReading(calories);
              }
            } catch (err) {
              // Silently skip parse errors
            }
          }
        );
        if (caloriesUnsubscribe) {
          monitorsRef.current.push(caloriesUnsubscribe);
          console.log('[BLE-V2] [Calories] ✓ Subscribed');
        }
      } catch (e) {
        // Silently skip
      }

      console.log('[BLE-V2] [STEP 7] ✓ Health metrics check complete');

      // Step 8: Connection complete
      console.log('[BLE-V2] [STEP 8] Connection complete!');
      console.log('[BLE-V2] ===== CONNECTION SUCCESS =====');
      console.log('[BLE-V2] Device:', deviceName);
      console.log('[BLE-V2] Status: Connected and monitoring');
      console.log('[BLE-V2] Waiting for data from device...');
      
      // Store device reference for cleanup
      if (!connectedDeviceRef.current) {
        connectedDeviceRef.current = connectedDevice;
      }

      return true;
    } catch (error) {
      console.error('[BLE-V2] ===== CONNECTION FAILED =====');
      console.error('[BLE-V2] Error:', error);
      if (isMounted.current) {
        setWatchData(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Connection failed'
        }));
      }
      return false;
    }
  }, [stopScan]);

  const disconnectDevice = useCallback(async () => {
    try {
      stopScan();

      // Clear all monitors
      for (const unsubscribe of monitorsRef.current) {
        try {
          unsubscribe();
        } catch (e) {
          console.warn('[BLE-V2] Error unsubscribing:', e);
        }
      }
      monitorsRef.current = [];
      subscribedCharsRef.current.clear();

      // Stop background service
      backgroundDataService.stop();

      // Disconnect from BLE service
      if (connectedDeviceRef.current) {
        try {
          await bleServiceRef.current.disconnectDevice(connectedDeviceRef.current.id);
        } catch (e) {
          console.warn('[BLE-V2] Disconnect error:', e);
        }
        connectedDeviceRef.current = null;
      }

      if (isMounted.current) {
        setWatchData(prev => ({ ...prev, status: 'disconnected' }));
      }
    } catch (error) {
      console.error('[BLE-V2] Disconnect error:', error);
    }
  }, [stopScan]);

  // ========== Retry Connection ==========
  const retryConnection = useCallback(async (device: Device) => {
    console.log('[BLE-V2] Retrying connection to:', device.name || device.id);
    setIsRetrying(true);
    setConnectionError(null);
    
    try {
      const result = await connectToDevice(device);
      if (result) {
        console.log('[BLE-V2] ✓ Retry successful');
      }
    } catch (error) {
      console.error('[BLE-V2] Retry failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Retry failed';
      setConnectionError(errorMsg);
    } finally {
      setIsRetrying(false);
    }
  }, [connectToDevice]);

  // ========== State Change Listener ==========
  useEffect(() => {
    const bleService = bleServiceRef.current;
    const unsubscribe = bleService.onStateChange((state: ConnectionState) => {
      if (isMounted.current) {
        setConnectionState(state);
        console.log('[BLE-V2] Connection state changed:', state);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ========== Lifecycle ==========
  useEffect(() => {
    isMounted.current = true;

    // Initialize local health data service
    (async () => {
      try {
        await localHealthServiceRef.current.initialize();
        console.log('[BLE-V2] Local health data service initialized');
      } catch (error) {
        console.error('[BLE-V2] Error initializing local health service:', error);
      }
    })();

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      isMounted.current = false;
      (async () => {
        try {
          // Disconnect device
          if (connectedDeviceRef.current) {
            try {
              await bleServiceRef.current.disconnectDevice(connectedDeviceRef.current.id);
            } catch (e) {
              console.warn('[BLE-V2] Disconnect error during cleanup:', e);
            }
            connectedDeviceRef.current = null;
          }
          
          // Clear monitors
          for (const unsubscribe of monitorsRef.current) {
            try {
              unsubscribe();
            } catch (e) {
              console.warn('[BLE-V2] Unsubscribe error during cleanup:', e);
            }
          }
          monitorsRef.current = [];
          
          // Destroy service
          try {
            await destroyImprovedBLEService();
          } catch (e) {
            console.warn('[BLE-V2] Service destroy error during cleanup:', e);
          }
        } catch (e) {
          console.warn('[BLE-V2] Cleanup error:', e);
        }
      })();
    };
  }, []);

  // ========== Exports ==========
  return {
    watchData,
    devices,
    isScanning,
    connectionState,
    deviceTypes: ['generic', 'miband', 'amazfit', 'firebolt'] as const,
    selectedDeviceType,
    setSelectedDeviceType,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    syncDeviceData: async () => {
      try {
        if (!connectedDeviceRef.current) return { success: false, error: 'No connected device' };
        
        // Get mobile sensor data (steps, calories from phone)
        const mobileData = mobileSensorService.getTodayData();
        
        const dataToSync = {
          ...watchData,
          steps: mobileData.steps || watchData.steps,
          calories: mobileData.calories || watchData.calories,
        };

        if (dataToSync && Object.keys(dataToSync).length > 0) {
          console.log('[BLE-V2] Syncing data to Supabase:', dataToSync);
          await syncToSupabase(dataToSync);
        }

        return { success: true };
      } catch (e: any) {
        console.error('[BLE-V2] syncDeviceData error:', e);
        return { success: false, error: e?.message ?? String(e) };
      }
    },
    syncToSupabase,
    isSyncing,
    lastSync,
    syncError,
    backgroundDataService,
    mobileSensorService,
    bleService: bleServiceRef.current,
    connectionError,
    isRetrying,
    retryConnection,
  };
};

export default useBLEWatchV2;
