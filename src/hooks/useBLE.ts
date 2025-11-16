import { useState, useEffect, useCallback } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

type DeviceType = 'miband' | 'amazfit' | 'firebolt' | 'generic';

interface BLEState {
  devices: Device[];
  connectedDevice: Device | null;
  isScanning: boolean;
  error: string | null;
  deviceData: {
    heartRate?: number;
    steps?: number;
    battery?: number;
    lastUpdated?: Date;
  };
  deviceType: DeviceType | null;
}

const useBLE = () => {
  const [state, setState] = useState<BLEState>({
    devices: [],
    connectedDevice: null,
    isScanning: false,
    error: null,
    deviceData: {},
    deviceType: null,
  });

  const bleManager = new BleManager();

  // Handle BLE state changes
  useEffect(() => {
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOff') {
        setState(prev => ({
          ...prev,
          error: 'Bluetooth is turned off. Please enable Bluetooth to continue.'
        }));
      }
    }, true);

    return () => {
      subscription.remove();
    };
  }, []);

  // Check if location services are enabled (simplified version)
  const checkLocationServices = useCallback(async () => {
    if (Platform.OS === 'android') {
      return await requestLocationPermission();
    }
    return true; // For iOS, we'll rely on the system to handle permissions
  }, []);

  // Open device settings
  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  // Show location services alert
  const showLocationServicesAlert = useCallback(() => {
    Alert.alert(
      'Location Services Required',
      'Bluetooth Low Energy scanning requires location services to be enabled. Please enable location services in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }
        }
      ]
    );
  }, []);

  // Request location permission (required for BLE on Android)
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs location permission to scan for BLE devices',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      return false;
    }
  };

  // Stop BLE scanning
  const stopScan = useCallback(() => {
    try {
      bleManager.stopDeviceScan();
      setState(prev => ({ ...prev, isScanning: false }));
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  }, []);

  // Scan for BLE devices
  const startScan = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isScanning: true, error: null }));
      
      // Request location permission on Android
      if (Platform.OS === 'android') {
        const granted = await requestLocationPermission();
        if (!granted) {
          showLocationServicesAlert();
          throw new Error('Location permission is required for BLE scanning');
        }
      }

      // Check location permissions
      const hasPermission = await checkLocationServices();
      if (!hasPermission) {
        showLocationServicesAlert();
        throw new Error('Location permission is required for BLE scanning');
      }

      // Start scanning
      bleManager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('BLE Scan Error:', error);
            const errorMessage = error.message.includes('Location services are disabled')
              ? 'Location services are disabled. Please enable location services to scan for BLE devices.'
              : error.message;
            
            setState(prev => ({
              ...prev,
              error: errorMessage,
              isScanning: false
            }));

            if (error.message.includes('Location services are disabled')) {
              showLocationServicesAlert();
            }
            return;
          }

          if (device?.name) {
            setState(prev => ({
              ...prev,
              devices: Array.from(
                new Map(
                  [...prev.devices, device].map(item => [item.id, item])
                ).values()
              )
            }));
          }
        }
      );

      // Stop scanning after 10 seconds
      setTimeout(() => {
        bleManager.stopDeviceScan();
        setState(prev => ({
          ...prev,
          isScanning: false
        }));
      }, 10000);

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start scanning',
        isScanning: false
      }));
    }
  }, []);

  // Connect to a BLE device
  const connectToDevice = useCallback(async (device: Device) => {
    try {
      setState(prev => ({ ...prev, isScanning: false, error: null }));
      
      // Stop scanning when connecting
      bleManager.stopDeviceScan();
      
      // Connect to the device
      const connectedDevice = await device.connect();
      
      // Discover services and characteristics
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      // Determine device type based on name or other characteristics
      const deviceType = determineDeviceType(device);
      
      // Start notifications or read data based on device type
      await setupDeviceNotifications(connectedDevice, deviceType);
      
      setState(prev => ({
        ...prev,
        connectedDevice,
        deviceType,
        devices: [],
        isScanning: false
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect to device',
        isScanning: false
      }));
      return false;
    }
  }, []);

  // Disconnect from device
  const disconnectDevice = useCallback(async () => {
    if (state.connectedDevice) {
      try {
        await state.connectedDevice.cancelConnection();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    
    setState(prev => ({
      ...prev,
      connectedDevice: null,
      deviceType: null,
      deviceData: {},
      devices: []
    }));
  }, [state.connectedDevice]);

  // Sync data to Supabase
  const syncToSupabase = useCallback(async (supabaseClient: any) => {
    if (!state.connectedDevice || !state.deviceData) return;
    
    try {
      const { data, error } = await supabaseClient
        .from('health_metrics')
        .upsert({
          device_id: state.connectedDevice.id,
          device_name: state.connectedDevice.name || 'Unknown Device',
          device_type: state.deviceType,
          heart_rate: state.deviceData.heartRate,
          steps: state.deviceData.steps,
          battery: state.deviceData.battery,
          timestamp: new Date().toISOString(),
          user_id: supabaseClient.auth.user()?.id
        });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing to Supabase:', error);
      throw error;
    }
  }, [state.connectedDevice, state.deviceData, state.deviceType]);

  // Helper function to determine device type
  const determineDeviceType = (device: Device): DeviceType => {
    const name = device.name?.toLowerCase() || '';
    
    if (name.includes('mi band') || name.includes('xiaomi')) return 'miband';
    if (name.includes('amazfit')) return 'amazfit';
    if (name.includes('firebolt')) return 'firebolt';
    
    return 'generic';
  };

  // Setup device-specific notifications
  const setupDeviceNotifications = async (device: Device, deviceType: DeviceType) => {
    // Implement device-specific notification setup here
    // This is a simplified example - you'll need to implement the actual BLE service/characteristic UUIDs
    // for each device type you want to support
    
    // Example for heart rate monitoring (standard BLE service)
    try {
      await device.monitorCharacteristicForService(
        '180D', // Heart Rate Service
        '2A37', // Heart Rate Measurement Characteristic
        (error, characteristic) => {
          if (error) {
            console.error('Error monitoring heart rate:', error);
            return;
          }
          
          if (characteristic?.value) {
            // Parse heart rate value (format depends on the BLE spec)
            const value = characteristic.value;
            const heartRate = value.charCodeAt(0); // Simplified example
            
            setState(prev => ({
              ...prev,
              deviceData: {
                ...prev.deviceData,
                heartRate,
                lastUpdated: new Date()
              }
            }));
          }
        }
      );
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  return {
    ...state,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    clearError: () => setState(prev => ({ ...prev, error: null })),
    clearDevices: () => setState(prev => ({ ...prev, devices: [] })),
    openSettings: () => {
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }
    },
  };
};

export default useBLE;
