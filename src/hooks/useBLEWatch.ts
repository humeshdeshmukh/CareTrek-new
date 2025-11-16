// src/hooks/useBLEWatch.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { BleManager, Device, Characteristic, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { saveHealthMetrics } from '../services/healthDataService';
import { supabase } from '../lib/supabase';
import { Buffer } from 'buffer';

type DeviceType = 'miband' | 'amazfit' | 'firebolt' | 'generic';

interface WatchData {
  status: 'connected' | 'disconnected' | 'connecting' | 'scanning' | 'error';
  deviceName?: string;
  deviceType?: DeviceType;
  heartRate?: number;
  steps?: number;
  battery?: number;
  oxygenSaturation?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  calories?: number;
  lastUpdated?: Date;
  firmwareVersion?: string;
  hardwareVersion?: string;
  rssi?: number | null;
  sleepData?: {
    deepSleep: number;
    lightSleep: number;
    remSleep: number;
    awake: number;
  } | null;
}

export const useBLEWatch = () => {
  const [watchData, setWatchData] = useState<WatchData>({ status: 'disconnected' });
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>('generic');

  const bleManagerRef = useRef<BleManager | null>(null);
  // initialize mounted flag as true (updated)
  const isMounted = useRef<boolean>(true);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartRateMonitorRef = useRef<{ cancel?: () => void } | null>(null);
  const stopScanRef = useRef<() => void>(() => {});

  // sync state additions
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const stopScan = useCallback(() => {
    try {
      if (bleManagerRef.current) {
        bleManagerRef.current.stopDeviceScan();
      }
    } catch (e) {
      console.warn('Error stopping scan:', e);
    }
    
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    
    if (isMounted.current) {
      setIsScanning(false);
      setWatchData(prev => ({
        ...prev,
        status: prev.status === 'connected' ? 'connected' : 'disconnected'
      }));
    }
  }, []);

  // Store the latest stopScan in a ref to avoid circular dependencies
  useEffect(() => {
    stopScanRef.current = stopScan;
  }, [stopScan]);

  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // For Android 10 (API 29) and above, we need to check for location permission
        // and assume location services are required for BLE scanning
        const apiLevel = parseInt(Platform.Version.toString(), 10);
        if (apiLevel >= 29) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Bluetooth Low Energy requires Location permission to scan for nearby devices',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Location Permission Required',
              'Bluetooth Low Energy requires Location permission to scan for nearby devices. Please grant the location permission in app settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Open Settings', 
                  onPress: () => {
                    Linking.openSettings();
                  } 
                }
              ]
            );
            return false;
          }
          
          // For Android 10+, we can proceed with just the location permission
          return true;
        }
        
        // Request location permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Bluetooth Low Energy requires Location permission to scan for nearby devices',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Error checking location services:', error);
        return false;
      }
    }
    return true; // For iOS, location services are not required for BLE scanning
  }, []);

  const showLocationServicesAlert = useCallback(() => {
    Alert.alert(
      'Location Services Required',
      'Bluetooth Low Energy requires Location Services to be enabled. Please enable Location Services in your device settings to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
            }
          } 
        }
      ]
    );
  }, []);

  const startScan = useCallback(async () => {
    if (!bleManagerRef.current) return;

    try {
      // Check and request necessary permissions
      if (Platform.OS === 'android') {
        try {
          const hasLocationPermission = await checkLocationServices();
          if (!hasLocationPermission) {
            console.log('Location services or permission not granted');
            showLocationServicesAlert();
            setWatchData(prev => ({ ...prev, status: 'error' }));
            return;
          }
        } catch (error) {
          console.error('Error checking location services:', error);
          showLocationServicesAlert();
          setWatchData(prev => ({ ...prev, status: 'error' }));
          return;
        }
      }

      setDevices([]);
      if (isMounted.current) {
        setIsScanning(true);
        setWatchData(prev => ({ ...prev, status: 'scanning' }));
      }

      // Start scanning for devices
      bleManagerRef.current.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('Scan error:', error);
            stopScanRef.current();
            
            // Handle specific BLE errors
            if (error.message.includes('Location services are disabled')) {
              showLocationServicesAlert();
            }
            
            return;
          }

          if (device?.name && isMounted.current) {
            setDevices(prevDevices => {
              // Check if device already exists in the list
              const deviceExists = prevDevices.some(d => d.id === device.id);
              return deviceExists ? prevDevices : [...prevDevices, device];
            });
          }
        },
      );

      // Stop scanning after 10 seconds
      scanTimeoutRef.current = setTimeout(() => {
        stopScanRef.current();
      }, 10000);

    } catch (error) {
      console.error('Error starting scan:', error);
      if (isMounted.current) {
        setIsScanning(false);
        setWatchData(prev => ({ ...prev, status: 'error' }));
      }
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScan();
      if (bleManagerRef.current) {
        bleManagerRef.current.destroy();
      }
    };
  }, [stopScan]);

  // Add check for BLE state
  useEffect(() => {
    if (!bleManagerRef.current) return;

    const subscription = bleManagerRef.current.onStateChange((state) => {
      if (state === 'PoweredOff') {
        Alert.alert(
          'Bluetooth is Off',
          'Please enable Bluetooth to connect to your device',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'android') {
                  Linking.openSettings();
                } else if (Platform.OS === 'ios') {
                  Linking.openURL('App-Prefs:Bluetooth');
                }
              },
            },
          ]
        );
      }
    }, true);

    return () => {
      subscription.remove();
    };
  }, []);

  if (!bleManagerRef.current) {
    bleManagerRef.current = new BleManager();
  }
  const bleManager = bleManagerRef.current;

  // mount/unmount tracking + cleanup
  useEffect(() => {
    // No need to set isMounted.current = true here because it's initialized to true above.
    return () => {
      // mark unmounted
      isMounted.current = false;

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }

      // cancel heart rate subscription if exists
      try {
        heartRateMonitorRef.current?.cancel && heartRateMonitorRef.current.cancel();
      } catch (_) {
        // ignore
      }

      try {
        bleManager.stopDeviceScan();
      } catch (_) {
        // ignore
      }
      // Optionally bleManager.destroy() depending on app lifecycle
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs location permission to scan for BLE devices',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK'
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }, []);

  // stopScan is already defined above with better implementation

  // Start BLE scanning (no demo data) with Bluetooth state check + error handling
  const scanForDevices = useCallback(async () => {
    if (isScanning) return;

    try {
      setDevices([]);
      setWatchData(prev => ({ ...prev, status: 'scanning' }));
      setIsScanning(true);

      // Check and request location permission
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setWatchData(prev => ({ ...prev, status: 'error' }));
        setIsScanning(false);
        return;
      }

      // Check Bluetooth state
      try {
        const state = await bleManager.state();
        const isPoweredOn = state === State.PoweredOn || String(state).toLowerCase() === 'poweredon';
        if (!isPoweredOn) {
          throw new Error('Bluetooth is not powered on');
        }
      } catch (error) {
        console.error('Bluetooth state error:', error);
        if (error instanceof Error && error.message.includes('powered off')) {
          Alert.alert(
            'Bluetooth is Off',
            'Please enable Bluetooth to connect to health devices',
            [
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
        }
        setWatchData(prev => ({ ...prev, status: 'error' }));
        setIsScanning(false);
        return;
      }

      // Start BLE scanning
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('BLE Scan Error:', error);
          
          // Handle location services disabled case
          if (error.message.includes('Location services are disabled')) {
            Alert.alert(
              'Location Services Required',
              'Bluetooth Low Energy scanning requires location services to be enabled.',
              [
                { 
                  text: 'Open Settings',
                  onPress: () => {
                    if (Platform.OS === 'ios') {
                      Linking.openURL('app-settings:');
                    } else {
                      Linking.openSettings();
                    }
                  }
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }
          
          setWatchData(prev => ({ ...prev, status: 'error' }));
          setIsScanning(false);
          return;
        }

        if (device?.name) {
          setDevices(prevDevices => {
            const exists = prevDevices.some(d => d.id === device.id);
            return exists ? prevDevices : [...prevDevices, device];
          });
        }
      });

      // stop after 10s
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      scanTimeoutRef.current = setTimeout(() => {
        try {
          bleManager.stopDeviceScan();
        } catch (_) {}
        if (!isMounted.current) return;
        setIsScanning(false);
        setWatchData(prev => (prev.status === 'connected' ? prev : { ...prev, status: 'disconnected' }));
        scanTimeoutRef.current = null;
      }, 10000);
    } catch (err) {
      console.error('Start Scan Error:', err);

      const message = (err as any)?.message?.toString?.() || '';
      if (message.includes('BluetoothLE is powered off') || message.toLowerCase().includes('powered off') || message.includes('Bluetooth is not powered on')) {
        Alert.alert(
          'Bluetooth is Off',
          'Please enable Bluetooth to connect to health devices',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'android') {
                  Linking.openSettings();
                } else {
                  Linking.openURL('app-settings:');
                }
              }
            },
            { text: 'OK' }
          ]
        );
      }

      if (isMounted.current) {
        setWatchData(prev => ({ ...prev, status: 'error' }));
        setIsScanning(false);
      }
    }
  }, [bleManager, requestPermissions]);

  // helper: parse heart rate notify payload (per BLE spec)
  const parseHeartRate = (valueBase64: string): number | undefined => {
    try {
      const buffer = Buffer.from(valueBase64, 'base64');
      const flags = buffer.readUInt8(0);
      const hrFormatUint16 = (flags & 0x01) !== 0;
      if (hrFormatUint16) {
        return buffer.readUInt16LE(1);
      } else {
        return buffer.readUInt8(1);
      }
    } catch (e) {
      // parsing failed
      return undefined;
    }
  };

  // Connect to device and attempt to read standard characteristics (no demo values)
  const connectToDevice = useCallback(async (device: Device) => {
    try {
      // Check Bluetooth state before connecting
      try {
        const state = await bleManager.state();
        const isPoweredOn = state === State.PoweredOn || String(state).toLowerCase() === 'poweredon';
        if (!isPoweredOn) {
          throw new Error('Bluetooth is not powered on');
        }
      } catch (stateErr) {
        // If bleManager.state() errors or reports off, present user action
        const msg = (stateErr as any)?.message?.toString?.() || '';
        if (msg.includes('BluetoothLE is powered off') || msg.toLowerCase().includes('powered off') || msg.includes('Bluetooth is not powered on')) {
          Alert.alert(
            'Bluetooth is Off',
            'Please enable Bluetooth to connect to health devices',
            [
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'android') {
                    Linking.openSettings();
                  } else {
                    Linking.openURL('app-settings:');
                  }
                }
              },
              { text: 'OK' }
            ]
          );
          if (isMounted.current) setWatchData(prev => ({ ...prev, status: 'error' }));
          return false;
        }
        // otherwise continue — some platforms may not support state() and will throw
      }

      // stop scanning when connecting
      stopScan();

      setWatchData(prev => ({ ...prev, status: 'connecting' }));

      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();

      // === ADDED LOG: Connected to device ===
      console.log('Connected to device:', device.name, device.id);

      if (!isMounted.current) {
        // optional: disconnect if unmounted
        try {
          await connected.cancelConnection();
        } catch (_) {}
        return false;
      }

      // Attempt to read RSSI if available
      try {
        // some implementations provide readRSSI()
        if ((connected as any).readRSSI && typeof (connected as any).readRSSI === 'function') {
          const r = await (connected as any).readRSSI();
          // r may be a number or object depending on lib version
          const rssi = typeof r === 'number' ? r : (r?.rssi ?? null);
          setWatchData(prev => ({ ...prev, rssi }));
        }
      } catch (e) {
        // ignore RSSI read errors
      }

      // set basic connected state (no demo metric values)
      setWatchData(prev => ({
        ...prev,
        status: 'connected',
        deviceName: device.name ?? prev.deviceName ?? device.id,
        rssi: prev?.rssi ?? undefined,
        lastUpdated: prev?.lastUpdated ?? undefined,
        deviceType: prev?.deviceType ?? 'generic'
      }));

      // Try reading Battery Level (standard Battery Service 0x180F / 0x2A19)
      try {
        const batteryChar = await connected.readCharacteristicForService('180F', '2A19');
        if (batteryChar?.value) {
          const buf = Buffer.from(batteryChar.value, 'base64');
          const level = buf.readUInt8(0);
          setWatchData(prev => ({ ...prev, battery: level, lastUpdated: new Date() }));
        }
      } catch (e) {
        // not all devices expose/allow read; ignore
      }

      // Try reading Device Information (firmware/hardware)
      try {
        const fwChar = await connected.readCharacteristicForService('180A', '2A26').catch(() => null);
        const hwChar = await connected.readCharacteristicForService('180A', '2A27').catch(() => null);

        const updates: Partial<WatchData> = {};
        if (fwChar?.value) {
          updates.firmwareVersion = Buffer.from(fwChar.value, 'base64').toString('utf8');
        }
        if (hwChar?.value) {
          updates.hardwareVersion = Buffer.from(hwChar.value, 'base64').toString('utf8');
        }
        if (Object.keys(updates).length) {
          updates.lastUpdated = new Date();
          setWatchData(prev => ({ ...prev, ...updates }));
        }
      } catch (e) {
        // ignore
      }

      // Subscribe to Heart Rate notifications if possible (service 0x180D / char 0x2A37)
      try {
        // ensure we remove previous subscription
        try {
          heartRateMonitorRef.current?.cancel && heartRateMonitorRef.current.cancel();
        } catch (_) {}

        // === UPDATED: log raw and parsed characteristic values ===
        const sub = connected.monitorCharacteristicForService(
          '180D',
          '2A37',
          (error: any, characteristic: Characteristic | null) => {
            if (!isMounted.current) return;
            if (error) {
              console.error('Characteristic monitor error:', error);
              return;
            }
            if (characteristic?.value) {
              // Use the exact logging you requested:
              console.log('Characteristic updated - raw value:', characteristic.value);
              const parsed = parseHeartRate(characteristic.value);
              console.log('Parsed heart rate:', parsed);
              if (typeof parsed === 'number') {
                setWatchData(prev => ({
                  ...prev,
                  heartRate: parsed,
                  lastUpdated: new Date()
                }));
              }
            }
          }
        );

        // monitorCharacteristicForService returns a subscription-like object depending on lib version.
        heartRateMonitorRef.current = {
          cancel: () => {
            try {
              (sub as any)?.remove && (sub as any).remove(); // new API
            } catch (_) {}
            try {
              (sub as any)?.cancel && (sub as any).cancel(); // older API
            } catch (_) {}
          }
        };
      } catch (e) {
        // ignore if monitor not supported
      }

      // NOTE: Steps, oxygen, blood pressure etc. are device-specific and typically require
      // either a custom BLE service/characteristic or specific parsing of a proprietary format.
      // Implement those reads/parsers here for each device model (MiBand, Amazfit, Firebolt).
      // For now we don't set those fields until you add device-specific logic.

      return true;
    } catch (error) {
      console.error('Connection Error:', error);

      const message = (error as any)?.message?.toString?.() || '';
      if (message.includes('BluetoothLE is powered off') || message.toLowerCase().includes('powered off') || message.includes('Bluetooth is not powered on')) {
        Alert.alert(
          'Bluetooth is Off',
          'Please enable Bluetooth to connect to health devices',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'android') {
                  Linking.openSettings();
                } else {
                  Linking.openURL('app-settings:');
                }
              }
            },
            { text: 'OK' }
          ]
        );
      }

      if (isMounted.current) {
        setWatchData(prev => ({ ...prev, status: 'error' }));
      }
      return false;
    }
  }, [stopScan, bleManager]);

  // Disconnect
  const disconnectDevice = useCallback(async () => {
    try {
      stopScan();

      // cancel heart rate monitor
      try {
        heartRateMonitorRef.current?.cancel && heartRateMonitorRef.current.cancel();
      } catch (_) {}

      setWatchData({ status: 'disconnected' });
      setDevices([]);
      setIsScanning(false);
    } catch (e) {
      console.error('Disconnect Error:', e);
    }
  }, [stopScan]);

  // Sync device data (local refresh) - does not fabricate values
  const syncDeviceData = useCallback(async () => {
    if (watchData.status !== 'connected') return { success: false, error: 'Not connected' };

    try {
      // Optionally attempt to refresh readable characteristics (battery/firmware etc.)
      // If you have a reference to the connected Device instance, use it here to re-read
      // characteristics. We do not create demo values.

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }, [watchData.status]);

  // Sync to Supabase (saveHealthMetrics) — unchanged
  const syncToSupabase = useCallback(async () => {
    if (watchData.status !== 'connected' || !watchData.deviceName) {
      return { success: false, error: 'No device connected' };
    }

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error('User not authenticated');

      const result = await saveHealthMetrics(user.id, watchData);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error syncing to Supabase:', error);
      return { success: false, error: error?.message ?? String(error) };
    }
  }, [watchData]);

  // Auto-sync effect
  useEffect(() => {
    const syncData = async () => {
      if (watchData.status === 'connected' && watchData.deviceName && watchData.lastUpdated) {
        try {
          setIsSyncing(true);
          setSyncError(null);
          const result = await syncToSupabase();
          if (result.success) {
            setLastSync(new Date());
          } else {
            setSyncError(result.error || 'Failed to sync data');
          }
        } catch (error) {
          console.error('Auto-sync error:', error);
          setSyncError('Auto-sync failed');
        } finally {
          setIsSyncing(false);
        }
      }
    };

    if (watchData.lastUpdated) {
      syncData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchData.heartRate, watchData.steps, watchData.oxygenSaturation, watchData.lastUpdated, syncToSupabase]);

  // defensive cleanup effect too
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      try {
        bleManager.stopDeviceScan();
      } catch (_) {}
      try {
        heartRateMonitorRef.current?.cancel && heartRateMonitorRef.current.cancel();
      } catch (_) {}
    };
  }, [bleManager]);

  return {
    watchData,
    devices,
    isScanning,
    deviceTypes: ['generic', 'miband', 'amazfit', 'firebolt'] as const,
    selectedDeviceType,
    setSelectedDeviceType,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    syncDeviceData,
    syncToSupabase,
    // Sync status
    isSyncing,
    lastSync,
    syncError,
    // WebView compatibility fields (left as no-ops)
    webViewRef: { current: null } as { current: any },
    handleMessage: () => {},
    handleError: () => {},
    handleWebViewLoad: () => {}
  };
};
