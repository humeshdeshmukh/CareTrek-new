// src/hooks/useBLE.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { BleManager, Device, Characteristic, State as BleState } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Linking, Alert, type Permission } from 'react-native';
import { Buffer } from 'buffer';

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

  // BleManager stable across renders
  const bleManagerRef = useRef<BleManager | null>(null);
  if (!bleManagerRef.current) bleManagerRef.current = new BleManager();
  const bleManager = bleManagerRef.current;

  // Keep a timeout ref to auto-stop scanning
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle BLE state changes
  useEffect(() => {
    let subscription: any = null;
    try {
      subscription = bleManager.onStateChange((s: BleState | string) => {
        const st = String(s).toLowerCase();
        if (st === 'poweredoff' || s === BleState.PoweredOff) {
          setState(prev => ({
            ...prev,
            error: 'Bluetooth is turned off. Please enable Bluetooth to continue.',
          }));
        }
      }, true);
    } catch (err) {
      console.warn('onStateChange subscribe failed', err);
    }

    return () => {
      try {
        if (!subscription) return;
        if (typeof subscription.remove === 'function') subscription.remove();
        else if (typeof subscription === 'function') subscription();
      } catch (_) {}
    };
    // bleManager is ref-stable; no deps
  }, []);

  // Request and check location permission (Android)
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      // Only request location permissions - BLUETOOTH_SCAN/CONNECT cause native errors
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
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      // On error, return true to allow scanning anyway
      return true;
    }
  }, []);

  // Check location permission & hint user if not
  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (!hasPermission) {
        const granted = await requestLocationPermission();
        if (!granted) {
          Alert.alert(
            'Location Services Required',
            'Bluetooth Low Energy scanning requires location access. Please enable location permissions.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') Linking.openURL('app-settings:');
                  else Linking.openSettings();
                },
              },
            ]
          );
          return false;
        }
      }
      return true;
    } catch (err) {
      console.warn('Error checking location services', err);
      // On error, return true to allow scanning anyway
      return true;
    }
  }, [requestLocationPermission]);

  // Graceful stopScan that clears timeout and updates state
  const stopScan = useCallback(() => {
    try {
      bleManager.stopDeviceScan();
    } catch (error) {
      console.warn('stopDeviceScan error', error);
    } finally {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      setState(prev => ({ ...prev, isScanning: false }));
    }
  }, [bleManager]);

  // Helper to show the "enable location services" alert
  const showLocationServicesAlert = useCallback(() => {
    Alert.alert(
      'Location Services Required',
      'Location services are disabled. Enable them in device settings to scan for BLE devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') Linking.openURL('app-settings:');
            else Linking.openSettings();
          },
        },
      ]
    );
  }, []);

  // Start scanning with stronger handling for "Location services disabled" errors
  const startScan = useCallback(async () => {
    // Clear previous errors
    setState(prev => ({ ...prev, error: null }));
    
    // Request permissions in background (non-blocking)
    checkLocationServices().catch(() => {});

    // Ensure Bluetooth powered on (best-effort)
    try {
      const mgrState = await bleManager.state();
      const isPoweredOn = mgrState === BleState.PoweredOn || String(mgrState).toLowerCase() === 'poweredon';
      if (!isPoweredOn) {
        setState(prev => ({ ...prev, error: 'Bluetooth is not enabled', isScanning: false }));
        return;
      }
    } catch (err) {
      // non-fatal; continue and rely on errors from startDeviceScan
    }

    // Try to start scan; handle synchronous throws and callback errors robustly
    let scanStarted = false;
    try {
      // startDeviceScan can throw synchronously on some platforms if location services are off
      bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          // specific handling for common location-disabled error
          const msg = String(error?.message ?? error);
          console.error('[Scan] monitor error:', error);
          if (msg.toLowerCase().includes('location services')) {
            // user-facing alert and stable error state
            showLocationServicesAlert();
            // ensure we stop and mark not scanning
            try { bleManager.stopDeviceScan(); } catch (_) {}
            if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
            setState(prev => ({ ...prev, error: 'Location services are disabled', isScanning: false }));
            return;
          }

          // generic BLE error: set error and stop scanning
          try { bleManager.stopDeviceScan(); } catch (_) {}
          if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
          setState(prev => ({ ...prev, error: msg, isScanning: false }));
          return;
        }

        // device found
        if (device) {
          setState(prev => {
            const map = new Map<string, Device>();
            [...prev.devices, device].forEach(d => {
              if (!map.has(d.id)) map.set(d.id, d);
              else {
                const existing = map.get(d.id)!;
                if (!existing.name && d.name) map.set(d.id, d);
              }
            });
            return { ...prev, devices: Array.from(map.values()) };
          });
        }
      });

      // if startDeviceScan didn't throw, consider scan started
      scanStarted = true;
      setState(prev => ({ ...prev, isScanning: true, error: null }));
    } catch (startErr: any) {
      // synchronous error (e.g. location services disabled)
      const msg = String(startErr?.message ?? startErr);
      console.error('[Scan] startDeviceScan threw:', startErr);
      if (msg.toLowerCase().includes('location services')) {
        showLocationServicesAlert();
        setState(prev => ({ ...prev, error: 'Location services are disabled', isScanning: false }));
      } else {
        setState(prev => ({ ...prev, error: msg, isScanning: false }));
      }
      return;
    }

    // If scan started, set an auto-stop timeout; ensure we clear previous one
    if (scanStarted) {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      scanTimeoutRef.current = setTimeout(() => {
        try { bleManager.stopDeviceScan(); } catch (_) {}
        setState(prev => ({ ...prev, isScanning: false }));
        scanTimeoutRef.current = null;
      }, 10000);
    }
  }, [bleManager, checkLocationServices, showLocationServicesAlert]);

  // Connect to a BLE device
  const connectToDevice = useCallback(async (device: Device) => {
    try {
      // Ensure scanning stopped
      try { bleManager.stopDeviceScan(); } catch (_) {}
      if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
      setState(prev => ({ ...prev, isScanning: false, error: null }));

      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();

      const deviceType: DeviceType = determineDeviceType(device);

      setState(prev => ({ ...prev, connectedDevice, deviceType, devices: [], isScanning: false }));

      // Setup notifications (best-effort)
      await setupDeviceNotifications(connectedDevice, deviceType);

      return true;
    } catch (err) {
      console.error('connectToDevice error', err);
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : String(err), isScanning: false }));
      return false;
    }
  }, [bleManager]);

  // Disconnect
  const disconnectDevice = useCallback(async () => {
    const connected = state.connectedDevice;
    if (connected) {
      try {
        await connected.cancelConnection();
      } catch (err) {
        console.warn('Error cancelling connection', err);
      }
    }
    setState(prev => ({
      ...prev,
      connectedDevice: null,
      deviceType: null,
      deviceData: {},
      devices: [],
    }));
  }, [state.connectedDevice]);

  // Sync to Supabase (user passes client)
  const syncToSupabase = useCallback(async (supabaseClient: any) => {
    if (!state.connectedDevice) return;
    try {
      await supabaseClient.from('health_metrics').upsert({
        device_id: state.connectedDevice.id,
        device_name: state.connectedDevice.name ?? 'Unknown Device',
        device_type: state.deviceType,
        heart_rate: state.deviceData.heartRate ?? null,
        steps: state.deviceData.steps ?? null,
        battery: state.deviceData.battery ?? null,
        timestamp: new Date().toISOString(),
        user_id: supabaseClient.auth?.user?.()?.id ?? null,
      });
    } catch (err) {
      console.error('Error syncing to Supabase', err);
      throw err;
    }
  }, [state.connectedDevice, state.deviceData, state.deviceType]);

  // Determine device type by name
  const determineDeviceType = (device: Device): DeviceType => {
    const name = (device.name ?? '').toLowerCase();
    if (name.includes('mi band') || name.includes('xiaomi')) return 'miband';
    if (name.includes('amazfit')) return 'amazfit';
    if (name.includes('firebolt')) return 'firebolt';
    return 'generic';
  };

  // Parse heart rate from base64 char value
  const parseHeartRateFromBase64 = (b64?: string): number | undefined => {
    if (!b64) return undefined;
    try {
      const buf = Buffer.from(b64, 'base64');
      if (buf.length >= 2) {
        const flags = buf.readUInt8(0);
        const is16 = (flags & 0x01) !== 0;
        const hr = is16 ? (buf.length >= 3 ? buf.readUInt16LE(1) : undefined) : buf.readUInt8(1);
        if (typeof hr === 'number' && hr > 0) return hr;
      } else if (buf.length === 1) {
        return buf.readUInt8(0);
      }
    } catch (_) {}
    return undefined;
  };

  // Setup notifications (simplified)
  const setupDeviceNotifications = async (device: Device, deviceType: DeviceType) => {
    try {
      (device as any).monitorCharacteristicForService?.(
        '180D',
        '2A37',
        (error: any, characteristic: Characteristic | null) => {
          if (error) {
            console.warn('Heart rate monitor error', error);
            return;
          }
          const hr = parseHeartRateFromBase64(characteristic?.value ?? undefined);
          if (typeof hr === 'number') {
            setState(prev => ({
              ...prev,
              deviceData: {
                ...prev.deviceData,
                heartRate: hr,
                lastUpdated: new Date(),
              }
            }));
          }
        }
      );
    } catch (err) {
      console.warn('setupDeviceNotifications error (hr)', err);
    }

    // read battery char if present (best-effort)
    try {
      const battChar = await (device as any).readCharacteristicForService?.('180F', '2A19').catch(() => null);
      if (battChar?.value) {
        const lvl = Buffer.from(battChar.value, 'base64').readUInt8(0);
        if (typeof lvl === 'number') {
          setState(prev => ({
            ...prev,
            deviceData: {
              ...prev.deviceData,
              battery: lvl,
              lastUpdated: new Date(),
            },
          }));
        }
      }
    } catch (_) {}
  };

  // Cleanup BleManager
  useEffect(() => {
    return () => {
      try {
        bleManager.stopDeviceScan();
      } catch (_) {}
      try {
        // Destroy manager to free native resources (may throw on some RN versions)
        bleManager.destroy?.();
      } catch (_) {}
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
  }, [bleManager]);

  return {
    ...state,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    clearError: () => setState(prev => ({ ...prev, error: null })),
    clearDevices: () => setState(prev => ({ ...prev, devices: [] })),
    openSettings: () => {
      if (Platform.OS === 'ios') Linking.openURL('app-settings:');
      else Linking.openSettings();
    },
    syncToSupabase,
  };
};

export default useBLE;
