// src/hooks/useBLEWatch.ts
// Defensive BLE hook with improved vendor parsing + stability filter
import { useState, useEffect, useCallback, useRef } from 'react';
import { BleManager, Device, Characteristic, State as BleState } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Alert, Linking, AppState } from 'react-native';
import { DeviceType, WatchData as WatchDataType } from '../types/ble';
import { saveHealthMetrics } from '../services/healthDataService';
import { supabase } from '../lib/supabase';
import { Buffer } from 'buffer';

// Types are now imported from '../types/ble'

type CharFlags = { uuid: string; isReadable?: boolean; isWritable?: boolean; isNotifiable?: boolean; };

export const useBLEWatch = () => {
  const [watchData, setWatchData] = useState<WatchDataType>({ status: 'disconnected' });
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>('generic');

  const bleManagerRef = useRef<BleManager | null>(null);
  const isMounted = useRef(true);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monitorsRef = useRef<Array<{ id?: string; cancel: () => void }>>([]);
  const connectedDeviceRef = useRef<Device | null>(null);

  const batteryRef = useRef<number | undefined>(undefined);
  const subscribedCharsRef = useRef<Set<string>>(new Set());

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);

  // ---------- syncToSupabase implementation ----------
  const syncToSupabase = useCallback(async (data: WatchDataType) => {
    if (isSyncing) return false;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('User not authenticated');

      // Ensure we have all required fields for the health metrics
      const metricData: WatchDataType = {
        ...data,
        deviceId: data.deviceId || 'unknown',
        deviceType: data.deviceType || 'generic',
        lastUpdated: data.lastUpdated || new Date(),
        timestamp: new Date().toISOString()
      };

      await saveHealthMetrics(session.user.id, metricData);
      setLastSync(new Date());
      return true;
    } catch (error) {
      console.error('Error syncing to Supabase:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to sync data');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Check and request location permissions (required for BLE scanning on Android)
  const requestLocationPermission = useCallback(async (forceRequest = false) => {
    if (Platform.OS !== 'android') return true;

    // If we already have permissions, return true
    if (!forceRequest && hasLocationPermission === true) {
      return true;
    }

    try {
      // First check current permissions without requesting
      const hasFineLocation = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      const hasBluetoothScan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      const hasBluetoothConnect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);

      const allGrantedStatus = hasFineLocation && hasBluetoothScan && hasBluetoothConnect;
      
      // If we already have all permissions, return true
      if (allGrantedStatus) {
        setHasLocationPermission(true);
        return true;
      }

      // If we're not forcing the request, return current status
      if (!forceRequest) {
        return allGrantedStatus;
      }

      // For now, we'll skip the shouldShowRequestPermissionRationale check
      // as it's causing issues with some React Native versions
      // Instead, we'll just check if we have the permissions already
      // and request them if we don't
      const hasDeniedPermanently = false;

      if (hasDeniedPermanently) {
        Alert.alert(
          'Permissions Required',
          'You have previously denied some required permissions. Please enable them in app settings to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }

      // Request permissions with proper typing
      type AndroidPermission = (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];
      const permissions: AndroidPermission[] = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];

      // Filter out already granted permissions
      const permissionsToRequest: AndroidPermission[] = [];
      if (!hasFineLocation) permissionsToRequest.push(permissions[0]);
      if (!hasBluetoothScan) permissionsToRequest.push(permissions[1]);
      if (!hasBluetoothConnect) permissionsToRequest.push(permissions[2]);

      if (permissionsToRequest.length === 0) return true;

      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      // Check if all requested permissions are granted
      const allRequestedGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );

      setHasLocationPermission(allRequestedGranted);

      if (!allRequestedGranted) {
        // Only log the warning in development
        if (__DEV__) {
          console.warn('Not all permissions were granted:', granted);
        }
        
        // Check if any permission was denied with 'never ask again'
        const shouldShowSettings = granted && Object.entries(granted).some(([permission, status]) => {
          return status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        });

        if (shouldShowSettings) {
          Alert.alert(
            'Permissions Required',
            'You have selected "Don\'t ask again". Please enable the required permissions in app settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        } else {
          Alert.alert(
            'Permissions Required',
            'CareTrek needs location and Bluetooth permissions to connect to your smartwatch.',
            [
              { text: 'OK', style: 'default' }
            ]
          );
        }
      }

      return allRequestedGranted;
    } catch (err) {
      console.warn('Error checking/requesting permissions:', err);
      return false;
    }
  }, [hasLocationPermission]);

  // ---------- small utilities ----------
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)));
  const isPrintableText = (buf: Buffer) => {
    if (!buf || buf.length === 0) return false;
    let printable = 0;
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) printable++;
    }
    return printable / buf.length > 0.6;
  };

  const safeSetWatchData = (updater: ((prev: WatchDataType) => Partial<WatchDataType>) | Partial<WatchDataType>) => {
    if (!isMounted.current) return;
    setWatchData(prev => {
      const next = typeof updater === 'function' ? { ...prev, ...updater(prev) } : { ...prev, ...updater };
      if (next.battery !== undefined) batteryRef.current = next.battery;
      return next as WatchDataType;
    });
  };

  const clearAllMonitors = () => {
    const mons = monitorsRef.current;
    monitorsRef.current = [];
    subscribedCharsRef.current.clear();
    for (const m of mons) {
      try { m.cancel(); } catch (_) {}
    }
  };

  const handleMonitorError = (error: any, name = 'BLE') => {
    const obj = error && typeof error === 'object' ? error : { message: String(error ?? 'Unknown') };
    const message = obj.message ?? 'Unknown BLE monitor error';
    const code = (obj as any).code ?? 'UNKNOWN';
    const reason = (obj as any).reason ?? message;
    console.error(`[${name}] monitor error:`, { message, code, reason, original: obj });
    return { message, code, reason };
  };

  const withRetry = async <T,>(op: () => Promise<T>, tries = 3, base = 400): Promise<T> => {
    let last: any;
    for (let i = 0; i < tries; i++) {
      try { return await op(); } catch (e) { last = e; if (i < tries - 1) await new Promise(r => setTimeout(r, base * Math.pow(2, i))); }
    }
    throw last || new Error('Unknown retry error');
  };

  // ---------- metrics stability helper ----------
  const stableRef = useRef<Record<string, { last?: any; count: number }>>({});
  const updateStableMetric = (key: string, value: any, acceptAfter = 2) => {
    const entry = stableRef.current[key] || { last: undefined, count: 0 };
    if (entry.last === value) {
      entry.count = Math.min(entry.count + 1, acceptAfter);
    } else {
      entry.last = value;
      entry.count = 1;
    }
    stableRef.current[key] = entry;
    if (entry.count >= acceptAfter) {
      // commit to watchData
      const update: Partial<WatchDataType> = { lastUpdated: new Date() };

      switch (key) {
        case 'heartRate':
          update.heartRate = value;
          break;
        case 'oxygenSaturation':
          update.oxygenSaturation = value;
          break;
        case 'steps':
          update.steps = value;
          break;
        case 'battery':
          update.battery = value;
          break;
        case 'calories':
          update.calories = value;
          break;
        case 'bloodPressure':
          if (value && typeof value === 'object') {
            update.bloodPressure = value;
          }
          break;
      }

      if (Object.keys(update).length > 1) { // More than just lastUpdated
        safeSetWatchData(update);
      }
    }
  };

  // ---------- parsers improved ----------
  const parseHeartRate = (b64: string): number | undefined => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length === 0) return undefined;
      if (isPrintableText(buf)) return undefined;

      // Case A: standard HR frame (flag + hr)
      if (buf.length >= 2) {
        const flags = buf.readUInt8(0);
        const is16 = (flags & 0x01) !== 0;
        const hr = is16 ? (buf.length >= 3 ? buf.readUInt16LE(1) : undefined) : buf.readUInt8(1);
        if (typeof hr === 'number' && hr >= 30 && hr <= 220) return clamp(hr, 30, 220);
      }

      // Case B: vendor sends a single byte HR (common)
      if (buf.length === 1) {
        const v = buf.readUInt8(0);
        if (v >= 30 && v <= 220) return clamp(v, 30, 220);
      }

      // Case C: search any byte for HR-like value
      for (let i = 0; i < buf.length; i++) {
        const v = buf.readUInt8(i);
        if (v >= 30 && v <= 220) return clamp(v, 30, 220);
      }
      return undefined;
    } catch { return undefined; }
  };

  const parseSpO2 = (b64: string): number | undefined => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length === 0) return undefined;
      if (isPrintableText(buf)) return undefined;
      // single byte spo2 (50-100)
      if (buf.length === 1) {
        const v = buf.readUInt8(0);
        if (v >= 50 && v <= 100) return clamp(v, 50, 100);
        return undefined;
      }
      // scan for plausible bytes
      for (let i = 0; i < buf.length; i++) {
        const v = buf.readUInt8(i);
        if (v >= 50 && v <= 100) return clamp(v, 50, 100);
      }
      return undefined;
    } catch { return undefined; }
  };

  // Try multiple interpretations for BP: uint16 LE/BE pairs at offsets 0 and 2
  const parseBloodPressure = (b64: string): { systolic: number; diastolic: number } | undefined => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length < 2) return undefined;
      if (isPrintableText(buf)) return undefined;

      const candidates: Array<{ sys: number; dia: number }> = [];

      // If at least 4 bytes, try (0..1) and (2..3) as LE/BE
      if (buf.length >= 4) {
        const sLE = buf.readUInt16LE(0);
        const dLE = buf.readUInt16LE(2);
        candidates.push({ sys: sLE, dia: dLE });

        const sBE = buf.readUInt16BE(0);
        const dBE = buf.readUInt16BE(2);
        candidates.push({ sys: sBE, dia: dBE });
      }

      // If 2 bytes only, try interpret as systolic and estimate diastolic (some devices encode compressed)
      if (buf.length === 2) {
        const valLE = buf.readUInt16LE(0);
        const valBE = buf.readUInt16BE(0);
        // treat as systolic, set diastolic = systolic - typical delta if plausible
        if (valLE >= 70 && valLE <= 260) candidates.push({ sys: valLE, dia: Math.max(40, valLE - 40) });
        if (valBE >= 70 && valBE <= 260) candidates.push({ sys: valBE, dia: Math.max(40, valBE - 40) });
      }

      // Evaluate candidates and pick the first plausible one
      for (const c of candidates) {
        const { sys, dia } = c;
        if (Number.isFinite(sys) && Number.isFinite(dia) && sys >= 70 && sys <= 260 && dia >= 40 && dia <= 200 && sys > dia) {
          return { systolic: clamp(sys, 70, 260), diastolic: clamp(dia, 40, 200) };
        }
      }

      // As last resort, scan buffer bytes for two plausible bytes (rare)
      for (let i = 0; i + 1 < buf.length; i++) {
        const a = buf.readUInt8(i), b = buf.readUInt8(i + 1);
        if (a >= 70 && a <= 260 && b >= 40 && b <= 200 && a > b) return { systolic: a, diastolic: b };
      }

      return undefined;
    } catch { return undefined; }
  };

  const parseCalories = (b64: string): number | undefined => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length === 0) return undefined;
      if (isPrintableText(buf)) return undefined;
      // try 2/3/4 byte little-endian int
      if (buf.length >= 2) {
        try {
          const v2 = buf.readUInt16LE(0);
          if (v2 > 0 && v2 < 200000) return v2;
        } catch {}
      }
      if (buf.length >= 3) {
        try {
          const v3 = buf.readUIntLE(0, 3);
          if (v3 > 0 && v3 < 200000) return v3;
        } catch {}
      }
      if (buf.length >= 4) {
        try {
          const v4 = buf.readUInt32LE(0);
          if (v4 > 0 && v4 < 200000) return v4;
        } catch {}
      }
      // scan bytes for plausible calories (e.g., 10..20000)
      for (let i = 0; i < buf.length; i++) {
        const v = buf.readUInt8(i);
        if (v > 10 && v < 20000) return v;
      }
      return undefined;
    } catch { return undefined; }
  };

  // Generic heuristics: try to extract HR/SPo2/BP/steps/calories from vendor notifications
  const parseGeneric = (b64: string, svc?: string, char?: string) => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length === 0) return null;
      if (isPrintableText(buf)) return null;

      // 1) Heart rate: single or found anywhere
      const hr = parseHeartRate(b64);
      if (typeof hr === 'number') return { heartRate: hr };

      // 2) SpO2:
      const spo2 = parseSpO2(b64);
      if (typeof spo2 === 'number') return { oxygenSaturation: spo2 };

      // 3) BP:
      const bp = parseBloodPressure(b64);
      if (bp) return { bloodPressure: bp };

      // 4) calories:
      const cal = parseCalories(b64);
      if (typeof cal === 'number' && cal > 0 && cal < 200000) return { calories: cal };

      // 5) steps (32-bit LE but require > 100 and plausibility)
      if (buf.length >= 4) {
        try {
          const steps = buf.readUInt32LE(0);
          if (steps > 50 && steps < 100000000) return { steps };
        } catch {}
      }

      // 6) single-byte ambiguous: if service isn't battery and value within HR range -> HR
      if (buf.length === 1) {
        const v = buf.readUInt8(0);
        const s = (svc || '').toLowerCase();
        const c = (char || '').toLowerCase();
        const isBattery = s.includes('180f') || c.includes('2a19');
        if (!isBattery) {
          if (v >= 30 && v <= 220) return { heartRate: v };
          if (v >= 50 && v <= 100) return { oxygenSaturation: v };
        } else {
          // official battery
          if (v >= 0 && v <= 100) return { battery: v };
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  // ---------- discover & log device info (with flags) ----------
  const logDeviceInfo = useCallback(async (device: Device) => {
    try {
      console.log('Discovering all services & characteristics (logDeviceInfo) ...');
      await device.discoverAllServicesAndCharacteristics().catch(() => null);

      const serviceSet = new Set<string>();
      const charSet = new Set<string>();
      const svcToChars = new Map<string, CharFlags[]>();

      const services: any[] = (device as any).services ? await (device as any).services() : [];
      console.log(`logDeviceInfo: found ${services.length} services`);

      for (const svc of services) {
        try {
          const svcUuid = (svc.uuid || '').toLowerCase();
          serviceSet.add(svcUuid);
          console.log(`Service: ${svcUuid} (primary=${svc.isPrimary ?? 'unknown'})`);
          let chars: any[] = [];
          try { chars = (svc.characteristics ? await svc.characteristics() : []); } catch (e) { /* ignore */ }

          svcToChars.set(svcUuid, []);
          console.log(`  Characteristics (${chars.length}):`);
          for (const c of chars) {
            try {
              const charUuid = (c.uuid || '').toLowerCase();
              charSet.add(charUuid);
              const flags: CharFlags = {
                uuid: charUuid,
                isReadable: !!c.isReadable,
                isWritable: !!(c.isWritable || c.isWritableWithoutResponse),
                isNotifiable: !!c.isNotifiable
              };
              if (!flags.isNotifiable && c.properties && Array.isArray(c.properties)) {
                flags.isNotifiable = c.properties.some((p: string) => p.toLowerCase().includes('notify'));
                flags.isReadable = flags.isReadable || c.properties.some((p: string) => p.toLowerCase().includes('read'));
                flags.isWritable = flags.isWritable || c.properties.some((p: string) => p.toLowerCase().includes('write'));
              }
              svcToChars.get(svcUuid)!.push(flags);
              const f = [
                flags.isReadable ? 'R' : '',
                flags.isWritable ? 'W' : '',
                flags.isNotifiable ? 'N' : ''
              ].filter(Boolean).join('');
              console.log(`   - ${charUuid} (${f || 'none'})`);
            } catch (ce) { console.warn('char logging error', ce); }
          }
        } catch (se) { console.warn('service logging error', se); }
      }

      return { serviceSet, charSet, svcToChars };
    } catch (e) {
      console.warn('logDeviceInfo error', e);
      return { serviceSet: new Set<string>(), charSet: new Set<string>(), svcToChars: new Map<string, CharFlags[]>() };
    }
  }, [isMounted]);

  // ---------- permissions ----------
  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    if (!isMounted.current) {
      return false;
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
          title: 'Location Permission',
          message: 'Bluetooth Low Energy requires Location permission to scan for nearby devices',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });

        if (!isMounted.current) {
          return false;
        }

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Location Permission Required', 'Please grant Location permission to allow BLE scanning.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
          return false;
        }
        return true;
      } catch (error) {
        console.error('Error checking location services:', error);
        return false;
      }
    }
    return true;
  }, [isMounted]);

  const stopScan = useCallback(() => {
    try { bleManagerRef.current?.stopDeviceScan(); } catch (_) {}
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (isMounted.current) {
      setIsScanning(false);
      safeSetWatchData((prev: WatchDataType) => ({ ...prev, status: prev.status === 'connected' ? 'connected' : 'disconnected' }));
    }
  }, [isMounted]);

  const startScan = useCallback(async () => {
    if (!bleManagerRef.current || isScanning) return false;

    // Check and request location permissions before scanning
    if (Platform.OS === 'android') {
      try {
        // First check without requesting to avoid unnecessary dialogs
        const hasPermission = await requestLocationPermission(false);
        
        if (!hasPermission) {
          // Only show the permission request dialog if we don't have permissions
          const permissionGranted = await requestLocationPermission(true);
          
          if (!permissionGranted) {
            Alert.alert(
              'Permissions Required',
              'CareTrek needs location and Bluetooth permissions to scan for nearby devices. ' +
              'Please enable the required permissions in app settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
            return false;
          }
        }
      } catch (error) {
        console.error('Error handling permissions:', error);
        return false;
      }
    }
    if (isScanning) return;

    const ok = await checkLocationServices();
    if (!ok) {
      safeSetWatchData({ status: 'error' });
      return;
    }

    setDevices([]);
    setIsScanning(true);
    safeSetWatchData({ status: 'scanning' });

    try {
      bleManagerRef.current?.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (!isMounted.current) return;
        if (error) { handleMonitorError(error, 'Scan'); stopScan(); return; }
        if (device && device.id) {
          setDevices(prev => (prev.some(d => d.id === device.id) ? prev : [...prev, device]));
        }
      });

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        try { bleManagerRef.current?.stopDeviceScan(); } catch (_) {}
        if (!isMounted.current) return;
        setIsScanning(false);
        safeSetWatchData((prev: WatchDataType) => ({ ...prev, status: prev.status === 'connected' ? 'connected' : 'disconnected' }));
        scanTimeoutRef.current = null;
      }, 10000);
    } catch (err) {
      handleMonitorError(err, 'startScan');
      safeSetWatchData({ status: 'error' });
      setIsScanning(false);
    }
  }, [checkLocationServices, isScanning, stopScan]);

  const connectToDevice = useCallback(async (device: Device) => {
    const mgr = bleManagerRef.current;
    if (!mgr) return false;

    try {
      try {
        await withRetry(async () => {
          const state = await mgr.state();
          const isPoweredOn = state === BleState.PoweredOn || String(state).toLowerCase() === 'poweredon';
          if (!isPoweredOn) throw new Error('Bluetooth not powered on');
          return state;
        }, 2);
      } catch (e) {
        console.warn('Bluetooth state check non-fatal:', e);
      }

      stopScan();
      safeSetWatchData({ status: 'connecting' });

      const connected = await withRetry<Device>(() => device.connect() as Promise<Device>, 3, 400);
      await connected.discoverAllServicesAndCharacteristics().catch(() => null);
      connectedDeviceRef.current = connected;

      const { serviceSet, charSet, svcToChars } = await logDeviceInfo(connected);

      const deviceName = device.name ?? device.id;
      let deviceType: DeviceType = 'generic';
      const lower = (device.name ?? '').toLowerCase();
      if (lower.includes('mi band') || lower.includes('miband') || lower.includes('mi')) deviceType = 'miband';
      else if (lower.includes('amazfit')) deviceType = 'amazfit';
      else if (lower.includes('firebolt')) deviceType = 'firebolt';

      safeSetWatchData((prev: WatchDataType) => ({
        ...prev,
        deviceName,
        deviceType,
        lastUpdated: new Date()
      }));

      // read RSSI
      try {
        const rr: any = (connected as any).readRSSI ? await (connected as any).readRSSI() : null;
        const rssi = typeof rr === 'number' ? rr : rr?.rssi ?? null;
        if (rssi !== null) safeSetWatchData({ rssi });
      } catch {}

      // read battery if official present
      try {
        if (serviceSet.has('0000180f-0000-1000-8000-00805f9b34fb') && charSet.has('00002a19-0000-1000-8000-00805f9b34fb')) {
          const batteryChar = await withRetry(async () => connected.readCharacteristicForService('180F', '2A19').catch(() => null), 2).catch(() => null);
          if (batteryChar?.value) {
            const level = Buffer.from(batteryChar.value, 'base64').readUInt8(0);
            if (level >= 0 && level <= 100) {
              updateStableMetric('battery', level, 1); // battery can update immediately
            }
          }
        }
      } catch (e) { console.warn('Battery read non-fatal', e); }

      const maybeUpdateBatteryLocal = (newLevel: number, fromBatteryChar = false) => {
        if (fromBatteryChar) updateStableMetric('battery', clamp(newLevel, 0, 100), 1);
        else updateStableMetric('battery', clamp(newLevel, 0, 100), 2);
      };

      // Helper: subscribe only if char is flagged notifiable
      const subscribeIfNotifiable = (svcUuid: string, charUuid: string, handler: (char: Characteristic | null, svcId?: string, charId?: string) => void) => {
        try {
          const chars = svcToChars.get(svcUuid) || [];
          const found = chars.find(c => c.uuid === charUuid);
          if (!found || !found.isNotifiable) return;
          const subId = `${svcUuid}:${charUuid}`;
          if (subscribedCharsRef.current.has(subId)) return;
          subscribedCharsRef.current.add(subId);

          const sub = connected.monitorCharacteristicForService(svcUuid, charUuid, (err, characteristic) => {
            try {
              if (!isMounted.current) return;
              if (err) { handleMonitorError(err, `Monitor ${svcUuid}/${charUuid}`); return; }
              handler(characteristic, svcUuid, charUuid);
            } catch (cbErr) { handleMonitorError(cbErr, `Callback ${svcUuid}/${charUuid}`); }
          });
          monitorsRef.current.push({ id: subId, cancel: () => { try { (sub as any).remove?.(); (sub as any).cancel?.(); } catch (_) {} } });
        } catch (e) { handleMonitorError(e, `subscribeIfNotifiable ${svcUuid}/${charUuid}`); }
      };

      // Heart Rate (if present)
      if (serviceSet.has('0000180d-0000-1000-8000-00805f9b34fb')) {
        subscribeIfNotifiable('0000180d-0000-1000-8000-00805f9b34fb', '00002a37-0000-1000-8000-00805f9b34fb', (characteristic) => {
          if (!characteristic?.value) return;
          const hr = parseHeartRate(characteristic.value);
          if (typeof hr === 'number') updateStableMetric('heartRate', hr, 2);
        });
      }

      // SpO2
      if (serviceSet.has('00001822-0000-1000-8000-00805f9b34fb')) {
        subscribeIfNotifiable('00001822-0000-1000-8000-00805f9b34fb', '00002a5f-0000-1000-8000-00805f9b34fb', (characteristic) => {
          if (!characteristic?.value) return;
          const s = parseSpO2(characteristic.value);
          if (typeof s === 'number') updateStableMetric('oxygenSaturation', s, 2);
        });
      }

      // Blood Pressure
      if (serviceSet.has('00001810-0000-1000-8000-00805f9b34fb')) {
        subscribeIfNotifiable('00001810-0000-1000-8000-00805f9b34fb', '00002a35-0000-1000-8000-00805f9b34fb', (characteristic) => {
          if (!characteristic?.value) return;
          const bp = parseBloodPressure(characteristic.value);
          if (bp) updateStableMetric('bloodPressure', bp, 2);
        });
      }

      // Vendor generic: subscribe to vendor chars flagged notifiable and apply heuristics
      try {
        for (const [svcUuid, charList] of Array.from(svcToChars.entries())) {
          for (const c of charList) {
            const lowChar = c.uuid;
            if (!c.isNotifiable) continue;
            // skip ones we already added
            if (['00002a37-0000-1000-8000-00805f9b34fb','00002a19-0000-1000-8000-00805f9b34fb','00002a5f-0000-1000-8000-00805f9b34fb','00002a35-0000-1000-8000-00805f9b34fb'].includes(lowChar)) continue;

            subscribeIfNotifiable(svcUuid, lowChar, (characteristic, svc, charU) => {
              if (!characteristic?.value) return;
              const parsed = parseGeneric(characteristic.value, svc, charU);
              if (!parsed) return;

              // map parsed outputs to stable updates
              if ((parsed as any).heartRate !== undefined) updateStableMetric('heartRate', (parsed as any).heartRate, 2);
              if ((parsed as any).oxygenSaturation !== undefined) updateStableMetric('oxygenSaturation', (parsed as any).oxygenSaturation, 2);
              if ((parsed as any).bloodPressure !== undefined) updateStableMetric('bloodPressure', (parsed as any).bloodPressure, 2);
              if ((parsed as any).steps !== undefined) {
                const s = (parsed as any).steps;
                // require steps plausibility (>0 & < 100 million) and change threshold
                if (typeof s === 'number' && s >= 0 && s < 1e8) updateStableMetric('steps', s, 2);
              }
              if ((parsed as any).calories !== undefined) updateStableMetric('calories', (parsed as any).calories, 2);
              if ((parsed as any).battery !== undefined) maybeUpdateBatteryLocal((parsed as any).battery, false);
            });
          }
        }
      } catch (e) { console.warn('Vendor monitors enumeration non-fatal', e); }

      return true;
    } catch (error) {
      handleMonitorError(error, 'connectToDevice');
      safeSetWatchData({ status: 'error' });
      return false;
    }

    function maybeUpdateBatteryLocal(newLevel: number, fromBatteryChar = false) {
      if (fromBatteryChar) updateStableMetric('battery', clamp(newLevel, 0, 100), 1);
      else updateStableMetric('battery', clamp(newLevel, 0, 100), 2);
    }
  }, [logDeviceInfo, stopScan]);

  // Updated disconnectDevice to use syncToSupabase as requested
  const disconnectDevice = useCallback(async () => {
    try {
      stopScan();
      clearAllMonitors();
      try { if (connectedDeviceRef.current) await connectedDeviceRef.current.cancelConnection().catch(() => null); } catch (_) {}
      connectedDeviceRef.current = null;

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.warn('User not authenticated during disconnect');
        return;
      }

      // Sync the latest watch data before disconnecting
      if (watchData.status === 'connected') {
        await syncToSupabase({
          ...watchData,
          deviceId: watchData.deviceId || 'unknown',
          deviceType: watchData.deviceType || 'generic',
          lastUpdated: new Date()
        });
      }

      setLastSync(new Date());
    } catch (error) {
      console.error('Error during disconnect:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to sync data');
    } finally {
      setIsSyncing(false);
      safeSetWatchData(prev => ({ ...prev, status: 'disconnected' }));
    }
  }, [isSyncing, stopScan, watchData, syncToSupabase, clearAllMonitors]);

  // Auto-sync effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (watchData.status === 'connected' && watchData.deviceName && watchData.lastUpdated) {
        try {
          setIsSyncing(true);
          setSyncError(null);
          const has = watchData.heartRate !== undefined ||
                     watchData.oxygenSaturation !== undefined ||
                     watchData.bloodPressure !== undefined ||
                     watchData.steps !== undefined ||
                     watchData.battery !== undefined ||
                     watchData.calories !== undefined;

          if (!has) return;

          await syncToSupabase(watchData);
          setLastSync(new Date());
        } catch (e) {
          console.error('Auto-sync error', e);
          setSyncError(e instanceof Error ? e.message : 'Unknown');
        } finally {
          setIsSyncing(false);
        }
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [watchData, syncToSupabase]);

  // ---------- manager lifecycle ----------
  useEffect(() => {
    if (!bleManagerRef.current) {
      try { bleManagerRef.current = new BleManager(); } catch (e) { console.error('BleManager init failed', e); }
    }
    const mgr = bleManagerRef.current;
    isMounted.current = true;

    let stateSub: { remove?: () => void } | null = null;
    try {
      stateSub = mgr?.onStateChange((s) => {
        try {
          if (!isMounted.current) return;
          if (String(s).toLowerCase() === 'poweredoff' || s === BleState.PoweredOff) {
            Alert.alert('Bluetooth is Off', 'Please enable Bluetooth to connect to devices.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]);
          }
        } catch (err) { console.warn('stateChange handler error', err); }
      }, true) ?? null;
    } catch (e) { console.warn('onStateChange subscription failed', e); }

    return () => {
      isMounted.current = false;
      if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
      try { mgr?.stopDeviceScan(); } catch (_) {}
      clearAllMonitors();
      try { mgr?.destroy(); } catch (_) {}
      if (stateSub?.remove) try { stateSub.remove(); } catch (_) {}
      bleManagerRef.current = null;
    };
  }, [isMounted]);

  // defensive cleanup
  useEffect(() => {
    return () => {
      clearAllMonitors();
      try { bleManagerRef.current?.stopDeviceScan(); } catch (_) {}
    };
  }, [isMounted]);

  // ---------- exports ----------
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
    syncDeviceData: async () => {
      try {
        if (!connectedDeviceRef.current) return { success: false, error: 'No connected device' };
        const dev = connectedDeviceRef.current;
        const batt = await dev.readCharacteristicForService('180F', '2A19').catch(() => null);
        if (batt?.value) { const lvl = Buffer.from(batt.value, 'base64').readUInt8(0); if (lvl >= 0 && lvl <= 100) updateStableMetric('battery', lvl, 1); }
        return { success: true };
      } catch (e: any) { return { success: false, error: e?.message ?? String(e) }; }
    },
    syncToSupabase,
    isSyncing,
    lastSync,
    syncError,
    webViewRef: { current: null as any },
    handleMessage: () => {},
    handleError: () => {},
    handleWebViewLoad: () => {}
  };
};

export default useBLEWatch;
