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
  bloodPressure?: { systolic: number; diastolic: number } | null;
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
  // keep extensible
  [k: string]: any;
}

export const useBLEWatch = () => {
  const [watchData, setWatchData] = useState<WatchData>({ status: 'disconnected' });
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>('generic');

  const bleManagerRef = useRef<BleManager | null>(null);
  const isMounted = useRef<boolean>(true);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // store multiple monitors/subscriptions to clean up
  const monitorsRef = useRef<Array<{ cancel: () => void }>>([]);
  const connectedDeviceRef = useRef<Device | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Ensure BleManager exists
  if (!bleManagerRef.current) bleManagerRef.current = new BleManager();
  const bleManager = bleManagerRef.current;

  // ---------- Helpers ----------
  const safeSetWatchData = (updater: Partial<WatchData> | ((prev: WatchData) => WatchData)) => {
    if (!isMounted.current) return;
    setWatchData(prev => (typeof updater === 'function' ? (updater as any)(prev) : { ...prev, ...updater }));
  };

  const clearAllMonitors = () => {
    const mons = monitorsRef.current;
    monitorsRef.current = [];
    for (const m of mons) {
      try {
        m.cancel();
      } catch (_) {}
    }
  };

  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = parseInt(Platform.Version.toString(), 10);
        // request location for BLE scanning if needed
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
            'Please grant Location permission to allow BLE scanning.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return false;
        }
        return true;
      } catch (error) {
        console.error('Error checking location services:', error);
        return false;
      }
    }
    return true;
  }, []);

  const showLocationServicesAlert = useCallback(() => {
    Alert.alert(
      'Location Services Required',
      'Please enable Location Services to scan for BLE devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => (Platform.OS === 'android' ? Linking.openSettings() : null) },
      ],
    );
  }, []);

  const stopScan = useCallback(() => {
    try {
      bleManager.stopDeviceScan();
    } catch (_) {}
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (isMounted.current) {
      setIsScanning(false);
      safeSetWatchData(prev => ({ ...prev, status: prev.status === 'connected' ? 'connected' : 'disconnected' }));
    }
  }, [bleManager]);

  // request permission helper
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
        title: 'Location Permission',
        message: 'This app needs location permission to scan for BLE devices',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK'
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }, []);

  // parse heart rate (BLE spec)
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
      return undefined;
    }
  };

  // parse SpO2 (Pulse Oximeter Measurement - simplified)
  const parseSpO2 = (valueBase64: string): number | undefined => {
    try {
      const buf = Buffer.from(valueBase64, 'base64');
      // Many vendors send SpO2 as a single byte percentage — fallback to heuristics
      if (buf.length === 1) return buf.readUInt8(0);
      // else try to find a plausible byte in the range 70-100
      for (let i = 0; i < buf.length; i++) {
        const v = buf.readUInt8(i);
        if (v >= 60 && v <= 100) return v;
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  // parse blood pressure (simple heuristic)
  const parseBloodPressure = (valueBase64: string): { systolic: number; diastolic: number } | undefined => {
    try {
      const buf = Buffer.from(valueBase64, 'base64');
      // BP Measurement (2A35) is complex; try simple parse: first two uint16's
      if (buf.length >= 4) {
        const systolic = buf.readUInt16LE(0);
        const diastolic = buf.readUInt16LE(2);
        if (systolic > 30 && diastolic > 20 && systolic > diastolic) {
          return { systolic, diastolic };
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  // generic heuristic parser for vendor notifications
  const parseGenericNotification = (valueBase64: string) => {
    try {
      const buf = Buffer.from(valueBase64, 'base64');
      // try to detect HR-like value
      for (let i = 0; i < buf.length; i++) {
        const v = buf.readUInt8(i);
        if (v >= 30 && v <= 220) {
          // treat as heart rate candidate
          return { heartRate: v };
        }
      }
      // try steps (large integers)
      if (buf.length >= 4) {
        const steps32 = buf.readUInt32LE(0);
        if (steps32 > 0 && steps32 < 10000000) {
          return { steps: steps32 };
        }
      }
      // try single byte battery/spo2
      if (buf.length === 1) {
        const v = buf.readUInt8(0);
        if (v >= 0 && v <= 100) {
          // ambiguous — could be battery or spo2; we prefer battery if we don't have better
          return { battery: v };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // ---------- Scanning ----------
  const startScan = useCallback(async () => {
    if (!bleManager) return;
    if (isScanning) return;

    // Permissions / Location check
    const ok = await checkLocationServices();
    if (!ok) {
      showLocationServicesAlert();
      safeSetWatchData({ status: 'error' });
      return;
    }

    setDevices([]);
    setIsScanning(true);
    safeSetWatchData({ status: 'scanning' });

    try {
      bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          stopScan();
          return;
        }
        if (device && device.id && device.name && isMounted.current) {
          setDevices(prev => (prev.some(d => d.id === device.id) ? prev : [...prev, device]));
        }
      });

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        try { bleManager.stopDeviceScan(); } catch (_) {}
        if (!isMounted.current) return;
        setIsScanning(false);
        safeSetWatchData(prev => ({ ...prev, status: prev.status === 'connected' ? 'connected' : 'disconnected' }));
        scanTimeoutRef.current = null;
      }, 10000);
    } catch (err) {
      console.error('startScan error', err);
      safeSetWatchData({ status: 'error' });
      setIsScanning(false);
    }
  }, [bleManager, checkLocationServices, isScanning, stopScan, showLocationServicesAlert]);

  // ---------- Connect & monitor ----------
  const connectToDevice = useCallback(async (device: Device) => {
    if (!bleManager) return false;

    try {
      // ensure bluetooth powered on
      try {
        const state = await bleManager.state();
        const isPoweredOn = state === State.PoweredOn || String(state).toLowerCase() === 'poweredon';
        if (!isPoweredOn) throw new Error('Bluetooth not powered on');
      } catch (e) {
        console.warn('Unable to confirm Bluetooth state:', e);
      }

      stopScan();

      safeSetWatchData({ status: 'connecting' });

      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();

      // store connected device
      connectedDeviceRef.current = connected;

      // basic info
      const deviceName = device.name ?? device.id;
      let deviceType: DeviceType = 'generic';
      const nameLower = (device.name ?? '').toLowerCase();
      if (nameLower.includes('mi band') || nameLower.includes('miband') || nameLower.includes('mi')) deviceType = 'miband';
      else if (nameLower.includes('amazfit')) deviceType = 'amazfit';
      else if (nameLower.includes('firebolt')) deviceType = 'firebolt';

      safeSetWatchData(prev => ({
        ...prev,
        status: 'connected',
        deviceName,
        deviceType
      }));

      // read RSSI if possible
      try {
        // some libs expose readRSSI()
        const rr: any = (connected as any).readRSSI ? await (connected as any).readRSSI() : null;
        const rssi = typeof rr === 'number' ? rr : rr?.rssi ?? null;
        if (rssi !== null) safeSetWatchData({ rssi });
      } catch {}

      // read battery (standard) if available
      try {
        const batteryChar = await connected.readCharacteristicForService('180F', '2A19').catch(() => null);
        if (batteryChar?.value) {
          const level = Buffer.from(batteryChar.value, 'base64').readUInt8(0);
          safeSetWatchData({ battery: level, lastUpdated: new Date() });
        }
      } catch (e) {
        // ignore
      }

      // device information chars
      try {
        const fwChar = await connected.readCharacteristicForService('180A', '2A26').catch(() => null);
        const hwChar = await connected.readCharacteristicForService('180A', '2A27').catch(() => null);
        const updates: Partial<WatchData> = {};
        if (fwChar?.value) updates.firmwareVersion = Buffer.from(fwChar.value, 'base64').toString('utf8');
        if (hwChar?.value) updates.hardwareVersion = Buffer.from(hwChar.value, 'base64').toString('utf8');
        if (Object.keys(updates).length) safeSetWatchData({ ...updates, lastUpdated: new Date() });
      } catch {}

      // Subscribe to standard Heart Rate (2A37)
      try {
        // attempt to monitor 0x180D/0x2A37 if present
        const hrMon = connected.monitorCharacteristicForService(
          '180D',
          '2A37',
          (error: any, characteristic: Characteristic | null) => {
            if (!isMounted.current) return;
            if (error) { console.error('HR monitor error:', error); return; }
            if (characteristic?.value) {
              console.log('[BLE] HR raw value (base64):', characteristic.value);
              const parsed = parseHeartRate(characteristic.value);
              if (typeof parsed === 'number') {
                safeSetWatchData({ heartRate: parsed, lastUpdated: new Date() });
              }
            }
          }
        );
        monitorsRef.current.push({ cancel: () => { try { (hrMon as any).remove?.(); (hrMon as any).cancel?.(); } catch (_) {} } });
      } catch (e) { /* ignore */ }

      // Subscribe to Pulse Oximeter (0x1822 / 0x2A5F) if available
      try {
        const spo2Mon = connected.monitorCharacteristicForService(
          '1822',
          '2A5F',
          (error: any, characteristic: Characteristic | null) => {
            if (!isMounted.current) return;
            if (error) { console.error('SpO2 monitor error:', error); return; }
            if (characteristic?.value) {
              console.log('[BLE] SpO2 raw value:', characteristic.value);
              const parsed = parseSpO2(characteristic.value);
              if (typeof parsed === 'number') safeSetWatchData({ oxygenSaturation: parsed, lastUpdated: new Date() });
            }
          }
        );
        monitorsRef.current.push({ cancel: () => { try { (spo2Mon as any).remove?.(); (spo2Mon as any).cancel?.(); } catch (_) {} } });
      } catch (e) { /* ignore */ }

      // Subscribe to Blood Pressure (0x1810 / 0x2A35)
      try {
        const bpMon = connected.monitorCharacteristicForService(
          '1810',
          '2A35',
          (error: any, characteristic: Characteristic | null) => {
            if (!isMounted.current) return;
            if (error) { console.error('BP monitor error:', error); return; }
            if (characteristic?.value) {
              console.log('[BLE] BP raw:', characteristic.value);
              const parsedBP = parseBloodPressure(characteristic.value);
              if (parsedBP) safeSetWatchData({ bloodPressure: parsedBP, lastUpdated: new Date() });
            }
          }
        );
        monitorsRef.current.push({ cancel: () => { try { (bpMon as any).remove?.(); (bpMon as any).cancel?.(); } catch (_) {} } });
      } catch (e) { /* ignore */ }

      // Device-specific / generic discovery: iterate services & characteristics and subscribe heuristically
      try {
        // Attempt to read all services & characteristics if API supports it
        const services: any[] = (connected as any).services ? await (connected as any).services() : [];
        for (const s of services) {
          try {
            const chars: any[] = (connected as any).characteristicsForService ? await (connected as any).characteristicsForService(s.uuid) : [];
            for (const c of chars) {
              const charUuid = (c.uuid || '').toLowerCase();
              const svcUuid = (s.uuid || '').toLowerCase();
              // Skip if already handled by standard UUIDs
              if (charUuid.includes('2a37') || charUuid.includes('2a19') || charUuid.includes('2a5f') || charUuid.includes('2a35')) continue;

              // attempt to monitor if notifiable
              // Some char objects expose isNotifiable / isNotifying flags
              const isNotifiable = !!(c.isNotifiable || c.isNotifying || (c.properties && (c.properties.includes?.('Notify') || c.properties.includes?.('notify'))));

              if (isNotifiable) {
                try {
                  const sub = connected.monitorCharacteristicForService(s.uuid, c.uuid, (err: any, char: Characteristic | null) => {
                    if (!isMounted.current) return;
                    if (err) {
                      // ignore per char
                      return;
                    }
                    if (!char?.value) return;
                    console.log(`[BLE] Generic notification from ${s.uuid} / ${c.uuid}:`, char.value);
                    // heuristics
                    const hr = parseHeartRate(char.value);
                    if (typeof hr === 'number') {
                      safeSetWatchData({ heartRate: hr, lastUpdated: new Date() });
                      return;
                    }
                    const spo2 = parseSpO2(char.value);
                    if (typeof spo2 === 'number') {
                      safeSetWatchData({ oxygenSaturation: spo2, lastUpdated: new Date() });
                      return;
                    }
                    const bp = parseBloodPressure(char.value);
                    if (bp) {
                      safeSetWatchData({ bloodPressure: bp, lastUpdated: new Date() });
                      return;
                    }
                    const generic = parseGenericNotification(char.value);
                    if (generic) {
                      safeSetWatchData({ ...generic, lastUpdated: new Date() });
                      return;
                    }
                  });
                  monitorsRef.current.push({ cancel: () => { try { (sub as any).remove?.(); (sub as any).cancel?.(); } catch (_) {} } });
                } catch (_) {}
              } else {
                // If readable, attempt to read once
                try {
                  const readChar = await connected.readCharacteristicForService(s.uuid, c.uuid).catch(() => null);
                  if (readChar?.value) {
                    console.log(`[BLE] Read ${s.uuid}/${c.uuid}:`, readChar.value);
                    const hr = parseHeartRate(readChar.value);
                    if (typeof hr === 'number') safeSetWatchData({ heartRate: hr, lastUpdated: new Date() });
                    const spo2 = parseSpO2(readChar.value);
                    if (typeof spo2 === 'number') safeSetWatchData({ oxygenSaturation: spo2, lastUpdated: new Date() });
                    const bp = parseBloodPressure(readChar.value);
                    if (bp) safeSetWatchData({ bloodPressure: bp, lastUpdated: new Date() });
                    const generic = parseGenericNotification(readChar.value);
                    if (generic) safeSetWatchData({ ...generic, lastUpdated: new Date() });
                  }
                } catch (_) {}
              }
            }
          } catch (_) {}
        }
      } catch (e) {
        // some platforms do not support services()/characteristicsForService() — it's best-effort
      }

      // If the device is a known vendor, you can add extra service/char subscriptions here.
      // Example (Mi Band / Amazfit / Firebolt heuristics) — best-effort logic:
      if (deviceType === 'miband') {
        // Many Mi Band devices use vendor-specific chars. We already set up generic monitors above.
      } else if (deviceType === 'amazfit') {
        // likewise
      } else if (deviceType === 'firebolt') {
        // likewise
      }

      return true;
    } catch (error) {
      console.error('Connection Error:', error);
      safeSetWatchData({ status: 'error' });
      return false;
    }
  }, [bleManager, stopScan]);

  const disconnectDevice = useCallback(async () => {
    try {
      stopScan();
      clearAllMonitors();
      connectedDeviceRef.current = null;
      safeSetWatchData({ status: 'disconnected' });
      setDevices([]);
      setIsScanning(false);
    } catch (e) {
      console.error('Disconnect error', e);
    }
  }, [stopScan]);

  // ---------- Sync (Supabase) ----------
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

      // call saveHealthMetrics (assumed to accept (userId, watchData))
      const result = await saveHealthMetrics(user.id, watchData);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error syncing to Supabase:', error);
      return { success: false, error: error?.message ?? String(error) };
    }
  }, [watchData]);

  // manual sync helper
  const syncDeviceData = useCallback(async () => {
    // This triggers a refresh of readable characteristics (best-effort)
    try {
      if (!connectedDeviceRef.current) return { success: false, error: 'No connected device' };
      const dev = connectedDeviceRef.current;
      // Read battery again
      try {
        const batteryChar = await dev.readCharacteristicForService('180F', '2A19').catch(() => null);
        if (batteryChar?.value) {
          const level = Buffer.from(batteryChar.value, 'base64').readUInt8(0);
          safeSetWatchData({ battery: level, lastUpdated: new Date() });
        }
      } catch {}

      // You can attempt other reads here; for most vendor metrics, rely on notifications (we've set up monitors)
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }, []);

  // auto-sync effect when watchData updates
  useEffect(() => {
    const autoSync = async () => {
      if (watchData.status === 'connected' && watchData.deviceName && watchData.lastUpdated) {
        setIsSyncing(true);
        setSyncError(null);
        const res = await syncToSupabase();
        if (res.success) setLastSync(new Date());
        else setSyncError(res.error ?? 'Failed to sync');
        setIsSyncing(false);
      }
    };
    if (watchData.lastUpdated) autoSync();
  }, [watchData.lastUpdated, watchData.status, watchData.deviceName, syncToSupabase]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      try { bleManager.stopDeviceScan(); } catch (_) {}
      clearAllMonitors();
      try { bleManager.destroy(); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // additional defensive cleanup effect
  useEffect(() => {
    return () => {
      clearAllMonitors();
      try { bleManager.stopDeviceScan(); } catch (_) {}
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
    syncToSupabase, // <--- exported so HealthScreen can call it
    // Sync status
    isSyncing,
    lastSync,
    syncError,
    // WebView compatibility fields (no-ops)
    webViewRef: { current: null as any },
    handleMessage: () => {},
    handleError: () => {},
    handleWebViewLoad: () => {}
  };
};
export default useBLEWatch;
