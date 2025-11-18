// src/hooks/useBLEWatch.ts
// Defensive BLE hook with improved vendor parsing + stability filter
import { useState, useEffect, useCallback, useRef } from 'react';
import { BleManager, Device, Characteristic, State as BleState } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Alert, Linking, AppState } from 'react-native';
import { DeviceType, WatchData as WatchDataType } from '../types/ble';
import { saveHealthMetrics } from '../services/healthDataService';
import { backgroundDataService } from '../services/backgroundDataService';
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

    // Skip sync if no device ID - we need it for the database
    if (!data.deviceId) {
      console.warn('[BLE] Skipping sync - no device ID available');
      return false;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('User not authenticated');

      // Ensure we have all required fields for the health metrics
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
      console.error('Error syncing to Supabase:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to sync data');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // ---------- permission helpers (robust) ----------
  // Helper to decide if running on Android 12+ where BLUETOOTH_SCAN/CONNECT are required
  const isAndroid12Plus = () => {
    try {
      // Platform.Version sometimes returns string; ensure number compare
      return Platform.OS === 'android' && Number(Platform.Version) >= 31;
    } catch {
      return false;
    }
  };

  // Return list of runtime permissions we should request on this platform/version
  const getRequiredAndroidPermissions = (): Array<(typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS]> => {
    if (isAndroid12Plus()) {
      // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT; location still sometimes required by OEMs
      return [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ];
    }
    // older Android: location is the main required for BLE scan
    return [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    ];
  };

  // robust single-run permission requester with NEVER_ASK_AGAIN handling and AppState re-check
  const requestLocationPermission = useCallback(async (forceRequest = false) => {
    if (Platform.OS !== 'android') return true;

    // If we already checked and it's true and not forcing, return
    if (!forceRequest && hasLocationPermission === true) return true;

    try {
      const required = getRequiredAndroidPermissions();

      // First, do a silent check for each required permission
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

      // If not forcing, return current combined value (silent)
      if (!forceRequest) {
        setHasLocationPermission(false);
        return false;
      }

      // Build list to request (exclude ones already granted)
      const toRequest = required.filter(r => !currentStatus[r]);

      // If nothing to request (defensive), return false
      if (toRequest.length === 0) {
        setHasLocationPermission(false);
        return false;
      }

      // Request multiple
      const granted = await PermissionsAndroid.requestMultiple(toRequest as any);

      // Evaluate results
      let allGranted = true;
      let anyNeverAskAgain = false;
      for (const perm of toRequest) {
        const status = granted[perm];
        if (status !== PermissionsAndroid.RESULTS.GRANTED) {
          allGranted = false;
          if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) anyNeverAskAgain = true;
        }
      }

      setHasLocationPermission(allGranted);

      if (!allGranted) {
        // If user selected "Don't ask again" on any - prompt to open settings
        if (anyNeverAskAgain) {
          Alert.alert(
            'Permissions Required',
            'Some required permissions were permanently denied. Please enable them in app settings to continue.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                  } catch {
                    // fallback: provide instructions
                    Alert.alert('Open Settings', 'Please open app settings and enable Location and Bluetooth permissions.');
                  }
                }
              }
            ]
          );
        } else {
          // Show rationale / explanation
          Alert.alert(
            'Permissions Required',
            'CareTrek needs location and Bluetooth permissions to connect to your smartwatch. Please allow them when prompted.',
            [{ text: 'OK', style: 'default' }]
          );
        }
      }

      return allGranted;
    } catch (err) {
      console.warn('Error checking/requesting permissions:', err);
      setHasLocationPermission(false);
      return false;
    }
  }, [hasLocationPermission]);

  // Check if location services are actually enabled on the device (not just permissions)
  const isLocationServicesEnabled = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      // Try using BleManager's native method if available
      const checkFn = (BleManager as any).checkLocationServicesEnabled;
      if (typeof checkFn === 'function') {
        try {
          const enabled = await checkFn();
          console.log('[BLE] Location services check result:', enabled);
          return enabled === true;
        } catch (e) {
          console.warn('[BLE] BleManager.checkLocationServicesEnabled error:', e);
          // On error, we can't determine state - let scan attempt and handle error in callback
          return true;
        }
      }
      console.log('[BLE] BleManager.checkLocationServicesEnabled not available - allowing scan to attempt');
      return true; // Method not available - let scan attempt; errors will be caught in callback
    } catch (err) {
      console.warn('[BLE] isLocationServicesEnabled error:', err);
      return true; // On error, allow scan to attempt
    }
  }, []);

  // Additional check wrapper called by scan flow; if user returns from settings we re-check
  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    if (!isMounted.current) return false;
    if (Platform.OS !== 'android') return true;

    // Quick silent check for permissions first (non-blocking)
    const silentOk = await requestLocationPermission(false);
    if (silentOk) return true;

    // If permissions not granted, actively request them
    const requested = await requestLocationPermission(true);
    if (!requested) {
      // show friendly dialog guiding to settings (avoid spamming)
      Alert.alert(
        'Permissions Required',
        'CareTrek needs location and Bluetooth permissions to scan for nearby devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
    return requested;
  }, [requestLocationPermission]);

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

  const parseBloodPressure = (b64: string): { systolic: number; diastolic: number } | undefined => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length < 2) return undefined;
      if (isPrintableText(buf)) return undefined;

      const candidates: Array<{ sys: number; dia: number }> = [];

      if (buf.length >= 4) {
        const sLE = buf.readUInt16LE(0);
        const dLE = buf.readUInt16LE(2);
        candidates.push({ sys: sLE, dia: dLE });

        const sBE = buf.readUInt16BE(0);
        const dBE = buf.readUInt16BE(2);
        candidates.push({ sys: sBE, dia: dBE });
      }

      if (buf.length === 2) {
        const valLE = buf.readUInt16LE(0);
        const valBE = buf.readUInt16BE(0);
        if (valLE >= 70 && valLE <= 260) candidates.push({ sys: valLE, dia: Math.max(40, valLE - 40) });
        if (valBE >= 70 && valBE <= 260) candidates.push({ sys: valBE, dia: Math.max(40, valBE - 40) });
      }

      for (const c of candidates) {
        const { sys, dia } = c;
        if (Number.isFinite(sys) && Number.isFinite(dia) && sys >= 70 && sys <= 260 && dia >= 40 && dia <= 200 && sys > dia) {
          return { systolic: clamp(sys, 70, 260), diastolic: clamp(dia, 40, 200) };
        }
      }

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
      for (let i = 0; i < buf.length; i++) {
        const v = buf.readUInt8(i);
        if (v > 10 && v < 20000) return v;
      }
      return undefined;
    } catch { return undefined; }
  };

  const parseGeneric = (b64: string, svc?: string, char?: string) => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length === 0) return null;
      if (isPrintableText(buf)) return null;

      const hr = parseHeartRate(b64);
      if (typeof hr === 'number') return { heartRate: hr };

      const spo2 = parseSpO2(b64);
      if (typeof spo2 === 'number') return { oxygenSaturation: spo2 };

      const bp = parseBloodPressure(b64);
      if (bp) return { bloodPressure: bp };

      const cal = parseCalories(b64);
      if (typeof cal === 'number' && cal > 0 && cal < 200000) return { calories: cal };

      if (buf.length >= 4) {
        try {
          const steps = buf.readUInt32LE(0);
          if (steps > 50 && steps < 100000000) return { steps };
        } catch {}
      }

      if (buf.length === 1) {
        const v = buf.readUInt8(0);
        const s = (svc || '').toLowerCase();
        const c = (char || '').toLowerCase();
        const isBattery = s.includes('180f') || c.includes('2a19');
        if (!isBattery) {
          if (v >= 30 && v <= 220) return { heartRate: v };
          if (v >= 50 && v <= 100) return { oxygenSaturation: v };
        } else {
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

  // ---------- permissions + AppState re-check ----------
  useEffect(() => {
    // When the app comes back to foreground, re-check Android permissions — useful after user opened Settings
    const onAppStateChange = (next: string) => {
      try {
        if (next === 'active' && Platform.OS === 'android') {
          // re-check silently
          requestLocationPermission(false).catch(() => {});
        }
      } catch {}
    };

    const subscription = AppState.addEventListener ? AppState.addEventListener('change', onAppStateChange) : null;
    return () => {
      try { subscription?.remove?.(); } catch (_) {}
    };
  }, [requestLocationPermission]);

  // ---------- scan/connection/monitoring ----------

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
    if (isScanning) return;

    console.log('[BLE] startScan called');

    // Check location services/permissions (non-blocking - let scan attempt anyway)
    checkLocationServices().catch(err => {
      console.warn('[BLE] checkLocationServices error (non-fatal):', err);
    });

    setDevices([]);
    setIsScanning(true);
    safeSetWatchData({ status: 'scanning' });

    let locationErrorShown = false; // Track if we've already shown the alert

    try {
      console.log('[BLE] Starting device scan...');
      bleManagerRef.current?.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (!isMounted.current) return;
        if (error) {
          const { message } = handleMonitorError(error, 'Scan');
          console.error('[BLE] Scan error:', message);
          // Check if this is a location services error
          if (message.toLowerCase().includes('location')) {
            console.warn('[BLE] Location services error detected during scan');
            safeSetWatchData({ status: 'error', error: 'Location services are disabled' });
            // Show alert to user only once per scan attempt
            if (!locationErrorShown) {
              locationErrorShown = true;
              Alert.alert(
                'Location Services Required',
                'BLE scanning requires location services to be enabled. Please:\n\n1. Go to Settings\n2. Select Location\n3. Turn ON location services\n\nThen return to CareTrek to scan for your smartwatch.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]
              );
            }
          } else {
            safeSetWatchData({ status: 'error', error: message });
          }
          stopScan();
          return;
        }
        if (device && device.id) {
          console.log('[BLE] Device found:', device.name || device.id);
          setDevices(prev => (prev.some(d => d.id === device.id) ? prev : [...prev, device]));
        }
      });

      console.log('[BLE] Scan started successfully');

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        console.log('[BLE] Scan timeout - stopping scan');
        try { bleManagerRef.current?.stopDeviceScan(); } catch (_) {}
        if (!isMounted.current) return;
        setIsScanning(false);
        safeSetWatchData((prev: WatchDataType) => ({ ...prev, status: prev.status === 'connected' ? 'connected' : 'disconnected' }));
        scanTimeoutRef.current = null;
      }, 10000);
    } catch (err) {
      console.error('[BLE] startScan exception:', err);
      handleMonitorError(err, 'startScan');
      safeSetWatchData({ status: 'error' });
      setIsScanning(false);
    }
  }, [checkLocationServices, isScanning, stopScan]);

  const connectToDevice = useCallback(async (device: Device | any) => {
    const mgr = bleManagerRef.current;
    if (!mgr) return false;

    // Wrap entire connection in a timeout (30 seconds max total)
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

      console.log('[BLE] Connecting to device:', device.name || device.id);
      
      // Get a fresh device object from the manager to ensure it has the connect method
      let deviceToConnect = device;
      if (!device.connect || typeof device.connect !== 'function') {
        console.log('[BLE] Device object missing connect method, retrieving from manager');
        try {
          deviceToConnect = await mgr.connectedDevices([]);
          const found = deviceToConnect.find((d: any) => d.id === device.id);
          if (found) {
            deviceToConnect = found;
          } else {
            // If not in connected list, try to get it from the manager
            deviceToConnect = device; // Fall back to original
          }
        } catch (e) {
          console.warn('[BLE] Could not retrieve device from manager:', e);
          deviceToConnect = device;
        }
      }
      
      // Add timeout to connection attempt (10 seconds max)
      const connectPromise = withRetry<Device>(() => deviceToConnect.connect() as Promise<Device>, 3, 400);
      const connectWithTimeout = Promise.race([
        connectPromise,
        new Promise<Device>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
        )
      ]);
      
      const connected = await connectWithTimeout;
      console.log('[BLE] Connected, discovering services...');
      
      // Add timeout to service discovery (8 seconds max)
      const discoverPromise = connected.discoverAllServicesAndCharacteristics();
      const discoverWithTimeout = Promise.race([
        discoverPromise,
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Service discovery timeout after 8s')), 8000)
        )
      ]);
      
      await discoverWithTimeout.catch(err => {
        console.warn('[BLE] Service discovery error (non-fatal):', err);
        // Continue anyway - we may have partial services
      });
      
      connectedDeviceRef.current = connected;
      console.log('[BLE] Device connected and services discovered');

      const deviceName = device.name ?? device.id;
      const deviceId = device.id; // Capture the actual device ID
      let deviceType: DeviceType = 'generic';
      const lower = (device.name ?? '').toLowerCase();
      if (lower.includes('mi band') || lower.includes('miband') || lower.includes('mi')) deviceType = 'miband';
      else if (lower.includes('amazfit')) deviceType = 'amazfit';
      else if (lower.includes('firebolt')) deviceType = 'firebolt';

      // Mark as connected early so UI updates immediately
      safeSetWatchData((prev: WatchDataType) => ({
        ...prev,
        deviceId,
        deviceName,
        deviceType,
        status: 'connected',
        lastUpdated: new Date()
      }));
      
      console.log('[BLE] Logging device info...');
      // Add timeout to logDeviceInfo (5 seconds max)
      const logPromise = logDeviceInfo(connected);
      const logWithTimeout = Promise.race([
        logPromise,
        new Promise<ReturnType<typeof logDeviceInfo>>((_, reject) => 
          setTimeout(() => reject(new Error('logDeviceInfo timeout after 5s')), 5000)
        )
      ]);
      
      const { serviceSet, charSet, svcToChars } = await logWithTimeout.catch(err => {
        console.warn('[BLE] logDeviceInfo error:', err);
        // Return empty sets to continue
        return { serviceSet: new Set<string>(), charSet: new Set<string>(), svcToChars: new Map<string, CharFlags[]>() };
      });

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

      // Initialize background data service
      try {
        await backgroundDataService.initialize(connected, mgr);
      } catch (e) {
        console.warn('[BLE] Background service init error:', e);
      }

      // Heart Rate (if present) - WITH CRASH PREVENTION
      if (serviceSet.has('0000180d-0000-1000-8000-00805f9b34fb')) {
        subscribeIfNotifiable('0000180d-0000-1000-8000-00805f9b34fb', '00002a37-0000-1000-8000-00805f9b34fb', (characteristic) => {
          try {
            if (!characteristic?.value) return;
            const hr = parseHeartRate(characteristic.value);
            if (typeof hr === 'number') {
              updateStableMetric('heartRate', hr, 2);
              // Add to background collection
              backgroundDataService.addHeartRateReading(hr);
            }
          } catch (err) {
            console.error('[BLE] Heart rate callback error:', err);
          }
        });
      }

      // SpO2 - WITH CRASH PREVENTION
      if (serviceSet.has('00001822-0000-1000-8000-00805f9b34fb')) {
        subscribeIfNotifiable('00001822-0000-1000-8000-00805f9b34fb', '00002a5f-0000-1000-8000-00805f9b34fb', (characteristic) => {
          try {
            if (!characteristic?.value) return;
            const s = parseSpO2(characteristic.value);
            if (typeof s === 'number') {
              updateStableMetric('oxygenSaturation', s, 2);
              backgroundDataService.addOxygenReading(s);
            }
          } catch (err) {
            console.error('[BLE] SpO2 callback error:', err);
          }
        });
      }

      // Blood Pressure - WITH CRASH PREVENTION
      if (serviceSet.has('00001810-0000-1000-8000-00805f9b34fb')) {
        subscribeIfNotifiable('00001810-0000-1000-8000-00805f9b34fb', '00002a35-0000-1000-8000-00805f9b34fb', (characteristic) => {
          try {
            if (!characteristic?.value) return;
            const bp = parseBloodPressure(characteristic.value);
            if (bp) updateStableMetric('bloodPressure', bp, 2);
          } catch (err) {
            console.error('[BLE] Blood pressure callback error:', err);
          }
        });
      }

      // Vendor generic: subscribe to vendor chars flagged notifiable and apply heuristics
      try {
        for (const [svcUuid, charList] of Array.from(svcToChars.entries())) {
          for (const c of charList) {
            const lowChar = c.uuid;
            // skip ones we already added
            if (['00002a37-0000-1000-8000-00805f9b34fb','00002a19-0000-1000-8000-00805f9b34fb','00002a5f-0000-1000-8000-00805f9b34fb','00002a35-0000-1000-8000-00805f9b34fb'].includes(lowChar)) continue;

            subscribeIfNotifiable(svcUuid, lowChar, (characteristic, svc, charU) => {
              try {
                if (!characteristic?.value) return;
                const parsed = parseGeneric(characteristic.value, svc, charU);
                if (!parsed) return;

                // map parsed outputs to stable updates
                if ((parsed as any).heartRate !== undefined) {
                  updateStableMetric('heartRate', (parsed as any).heartRate, 2);
                  backgroundDataService.addHeartRateReading((parsed as any).heartRate);
                }
                if ((parsed as any).oxygenSaturation !== undefined) {
                  updateStableMetric('oxygenSaturation', (parsed as any).oxygenSaturation, 2);
                  backgroundDataService.addOxygenReading((parsed as any).oxygenSaturation);
                }
                if ((parsed as any).bloodPressure !== undefined) updateStableMetric('bloodPressure', (parsed as any).bloodPressure, 2);
                if ((parsed as any).steps !== undefined) {
                  const s = (parsed as any).steps;
                  if (typeof s === 'number' && s >= 0 && s < 1e8) {
                    updateStableMetric('steps', s, 2);
                    backgroundDataService.addStepsReading(s);
                  }
                }
                if ((parsed as any).calories !== undefined) {
                  updateStableMetric('calories', (parsed as any).calories, 2);
                  backgroundDataService.addCaloriesReading((parsed as any).calories);
                }
                if ((parsed as any).battery !== undefined) maybeUpdateBatteryLocal((parsed as any).battery, false);
              } catch (err) {
                console.error('[BLE] Vendor callback error:', err);
              }
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
      
      // Stop background service but keep data for persistence
      backgroundDataService.stop();
      
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

  // Auto-sync effect disabled - only sync on manual button press
  // This prevents the sync button from flickering or auto-clicking
  // Users can manually sync by pressing the "Sync Now" button
  // useEffect(() => {
  //   // Only sync if connected and has data
  //   if (watchData.status !== 'connected' || !watchData.deviceName) {
  //     return;
  //   }
  //
  //   const has = watchData.heartRate !== undefined ||
  //              watchData.oxygenSaturation !== undefined ||
  //              watchData.bloodPressure !== undefined ||
  //              watchData.steps !== undefined ||
  //              watchData.battery !== undefined ||
  //              watchData.calories !== undefined;
  //
  //   if (!has) return;
  //
  //   // Debounce auto-sync: wait 5 seconds after last watchData update before syncing
  //   const timer = setTimeout(async () => {
  //     if (!isMounted.current) return;
  //     
  //     try {
  //       setIsSyncing(true);
  //       setSyncError(null);
  //       await syncToSupabase(watchData);
  //       setLastSync(new Date());
  //     } catch (e) {
  //       console.error('Auto-sync error', e);
  //       setSyncError(e instanceof Error ? e.message : 'Unknown');
  //     } finally {
  //       setIsSyncing(false);
  //     }
  //   }, 5000); // 5 second debounce
  //
  //   return () => clearTimeout(timer);
  // }, [watchData.heartRate, watchData.oxygenSaturation, watchData.bloodPressure, watchData.steps, watchData.battery, watchData.calories, watchData.status, watchData.deviceName, syncToSupabase]);

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

        // Read battery
        const batt = await dev.readCharacteristicForService('180F', '2A19').catch(() => null);
        if (batt?.value) { 
          const lvl = Buffer.from(batt.value, 'base64').readUInt8(0); 
          if (lvl >= 0 && lvl <= 100) updateStableMetric('battery', lvl, 1); 
        }

        // Sync current watch data to Supabase
        if (watchData && Object.keys(watchData).length > 0) {
          console.log('[BLE] Syncing data to Supabase:', watchData);
          await syncToSupabase(watchData);
        }

        return { success: true };
      } catch (e: any) { 
        console.error('[BLE] syncDeviceData error:', e);
        return { success: false, error: e?.message ?? String(e) }; 
      }
    },
    syncToSupabase,
    isSyncing,
    lastSync,
    syncError,
    backgroundDataService,
    webViewRef: { current: null as any },
    handleMessage: () => {},
    handleError: () => {},
    handleWebViewLoad: () => {}
  };
};

export default useBLEWatch;
