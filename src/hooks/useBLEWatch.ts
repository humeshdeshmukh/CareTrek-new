// src/hooks/useBLEWatch.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { saveHealthMetrics } from '../services/healthDataService';
import { supabase } from '../lib/supabase';

type DeviceType = 'miband' | 'amazfit' | 'firebolt' | 'generic';

interface WatchData {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
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
}

export const useBLEWatch = () => {
  const [watchData, setWatchData] = useState<WatchData>({ status: 'disconnected' });
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>('generic');
  const bleManagerRef = useRef<BleManager | null>(null);

  // create BleManager once
  if (!bleManagerRef.current) {
    bleManagerRef.current = new BleManager();
  }
  const bleManager = bleManagerRef.current;

  // Request necessary permissions
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs location permission to scan for BLE devices',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }, []);

  // Start BLE scanning
  const startScan = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission is required for BLE scanning');
      }

      setIsScanning(true);
      setDevices([]);
      setWatchData(prev => ({ ...prev, status: 'connecting' }));

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('BLE Scan Error:', error);
          setIsScanning(false);
          return;
        }

        if (device?.name) {
          setDevices(prevDevices => {
            const existingIndex = prevDevices.findIndex(d => d.id === device.id);
            if (existingIndex >= 0) {
              const updatedDevices = [...prevDevices];
              updatedDevices[existingIndex] = device;
              return updatedDevices;
            }
            return [...prevDevices, device];
          });
        }
      });

      // Stop scanning after 10 seconds
      setTimeout(() => {
        try {
          bleManager.stopDeviceScan();
        } catch (e) {
          // ignore stop errors
        }
        setIsScanning(false);
      }, 10000);
    } catch (error: any) {
      console.error('Start Scan Error:', error);
      setWatchData(prev => ({ ...prev, status: 'error' }));
      setIsScanning(false);
    }
  }, [bleManager, requestPermissions]);

  // Connect to a device
  const connectToDevice = useCallback(async (device: Device) => {
    try {
      setWatchData(prev => ({ ...prev, status: 'connecting' }));

      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // Simulate device data - replace with actual BLE service/characteristic reads
      setWatchData({
        status: 'connected',
        deviceName: device.name || 'Smart Watch',
        deviceType: 'generic',
        heartRate: 72 + Math.floor(Math.random() * 20),
        steps: 5000 + Math.floor(Math.random() * 2000),
        battery: 80 + Math.floor(Math.random() * 20),
        oxygenSaturation: 95 + Math.floor(Math.random() * 5),
        bloodPressure: {
          systolic: 110 + Math.floor(Math.random() * 20),
          diastolic: 70 + Math.floor(Math.random() * 10)
        },
        calories: 1200 + Math.floor(Math.random() * 500),
        lastUpdated: new Date(),
        firmwareVersion: '1.0.0',
        hardwareVersion: '1.0',
        rssi: device.rssi ?? null
      });

      return true;
    } catch (error) {
      console.error('Connection Error:', error);
      setWatchData(prev => ({ ...prev, status: 'error' }));
      return false;
    }
  }, []);

  // Disconnect from device
  const disconnectDevice = useCallback(async () => {
    try {
      try {
        bleManager.stopDeviceScan();
      } catch (e) {
        // ignore
      }
      setWatchData({ status: 'disconnected' });
      setDevices([]);
    } catch (error) {
      console.error('Disconnect Error:', error);
    }
  }, [bleManager]);

  // Sync device data (local refresh)
  const syncDeviceData = useCallback(async () => {
    if (watchData.status !== 'connected') return { success: false, error: 'Not connected' };

    // Simulate data refresh
    setWatchData(prev => ({
      ...prev,
      heartRate: 70 + Math.floor(Math.random() * 20),
      steps: (prev.steps || 0) + Math.floor(Math.random() * 100),
      battery: Math.max(0, (prev.battery ?? 100) - 1),
      lastUpdated: new Date()
    }));

    return { success: true };
  }, [watchData.status]);

  // Sync to Supabase (saveHealthMetrics)
  const syncToSupabase = useCallback(async () => {
    if (watchData.status !== 'connected' || !watchData.deviceName) {
      return { success: false, error: 'No device connected' };
    }

    try {
      // get authenticated user
      // supabase.auth.getUser() returns { data: { user }, error } in newer libs
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      const result = await saveHealthMetrics(user.id, watchData);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error syncing to Supabase:', error);
      return { success: false, error: error?.message ?? String(error) };
    }
  }, [watchData]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      try {
        bleManager.stopDeviceScan();
      } catch (e) {
        // ignore
      }
      // optionally destroy manager if needed: bleManager.destroy() (but ensure platform considerations)
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
    connectToDevice,
    disconnectDevice,
    syncDeviceData,
    syncToSupabase,
    // For WebView compatibility (kept to match your existing code)
    webViewRef: { current: null } as { current: any },
    handleMessage: () => {},
    handleError: () => {},
    handleWebViewLoad: () => {},
  };
};
