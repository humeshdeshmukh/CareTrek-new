// src/hooks/useBLEWatch.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { BleManager, Device, Characteristic, State as BleState } from 'react-native-ble-plx';
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
  [k: string]: any;
}

export const useBLEWatch = () => {
  const [watchData, setWatchData] = useState<WatchData>({ status: 'disconnected' });
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>('generic');

  const bleManagerRef = useRef<BleManager | null>(null);
  const isMounted = useRef(true);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monitorsRef = useRef<Array<{ cancel: () => void }>>([]);
  const connectedDeviceRef = useRef<Device | null>(null);

  // use refs for frequently-read values to avoid stale closures
  const batteryRef = useRef<number | undefined>(undefined);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // ---------- helpers ----------
  const safeSetWatchData = (updater: Partial<WatchData> | ((prev: WatchData) => WatchData)) => {
    if (!isMounted.current) return;
    setWatchData(prev => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : { ...prev, ...updater };
      if ((next as any).battery !== undefined) batteryRef.current = (next as any).battery;
      return next;
    });
  };

  const clearAllMonitors = () => {
    const mons = monitorsRef.current;
    monitorsRef.current = [];
    for (const m of mons) {
      try { m.cancel(); } catch (_) {}
    }
  };

  const isMostlyPrintableAscii = (buf: Buffer) => {
    if (!buf || buf.length === 0) return false;
    let printable = 0;
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) printable++;
    }
    return printable / buf.length > 0.6;
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(val)));

  // Robust error wrapper: always produce an Error object (never null)
  const handleMonitorError = (error: any, monitorName = 'BLE') => {
    const safeErr = error && typeof error === 'object' ? error : { message: String(error ?? 'Unknown BLE error') };
    const message = safeErr.message || `Unknown error in ${monitorName}`;
    const code = (safeErr as any).code || 'UNKNOWN_ERROR';
    const reason = (safeErr as any).reason || message;
    // do not re-throw; log and mark state
    console.error(`${monitorName} monitor error:`, { message, code, reason, original: safeErr });
    safeSetWatchData({ status: 'error' });
    return new Error(`${monitorName}: ${message}`);
  };

  // retry helper for flaky native calls
  const withRetry = async <T,>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 400): Promise<T> => {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (e) {
        lastErr = e;
        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, baseDelay * Math.pow(2, attempt - 1)));
        }
      }
    }
    throw lastErr || new Error('Unknown error in withRetry');
  };

  // ---------- permissions ----------
  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
          title: 'Location Permission',
          message: 'This app needs location permission to scan for BLE devices',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK'
        });
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Location Permission', 'Please grant location permission to scan for BLE devices', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]);
          return false;
        }
        return true;
      } catch (e) {
        console.error('checkLocationServices error', e);
        return false;
      }
    }
    return true;
  }, []);

  const showLocationServicesAlert = useCallback(() => {
    Alert.alert('Location Services Required', 'Please enable Location Services to scan for BLE devices.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => (Platform.OS === 'android' ? Linking.openSettings() : null) }
    ]);
  }, []);

  const stopScan = useCallback(() => {
    try { bleManagerRef.current?.stopDeviceScan(); } catch (_) {}
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (isMounted.current) {
      setIsScanning(false);
      safeSetWatchData(prev => ({ ...prev, status: prev.status === 'connected' ? 'connected' : 'disconnected' }));
    }
  }, []);

  // ---------- parsers (defensive) ----------
  const parseHeartRate = (valueBase64: string): number | undefined => {
    try {
      const buffer = Buffer.from(valueBase64, 'base64');
      if (!buffer || buffer.length < 2) return undefined;
      if (isMostlyPrintableAscii(buffer)) return undefined;
      const flags = buffer.readUInt8(0);
      const hr16 = (flags & 0x01) !== 0;
      const hr = hr16 ? buffer.readUInt16LE(1) : buffer.readUInt8(1);
      if (!Number.isFinite(hr) || hr < 30 || hr > 220) return undefined;
      return clamp(hr, 30, 220);
    } catch {
      return undefined;
    }
  };

  const parseSpO2 = (valueBase64: string): number | undefined => {
    try {
      const buf = Buffer.from(valueBase64, 'base64');
      if (!buf || buf.length === 0) return undefined;
      if (isMostlyPrintableAscii(buf)) return undefined;
      if (buf.length === 1) {
        const v = buf.readUInt8(0);
        if (v >= 50 && v <= 100) return clamp(v, 50, 100);
        return undefined;
      }
      for (let i = 0; i < buf.length; i++) {
        const v = buf.readUInt8(i);
        if (v >= 50 && v <= 100) return clamp(v, 50, 100);
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  const parseBloodPressure = (valueBase64: string): { systolic: number; diastolic: number } | undefined => {
    try {
      const buf = Buffer.from(valueBase64, 'base64');
      if (!buf || buf.length < 4) return undefined;
      if (isMostlyPrintableAscii(buf)) return undefined;
      const systolic = buf.readUInt16LE(0);
      const diastolic = buf.readUInt16LE(2);
      if (
        Number.isFinite(systolic) &&
        Number.isFinite(diastolic) &&
        systolic >= 70 && systolic <= 260 &&
        diastolic >= 40 && diastolic <= 200 &&
        systolic > diastolic
      ) {
        return { systolic: clamp(systolic, 70, 260), diastolic: clamp(diastolic, 40, 200) };
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  const parseGenericNotification = (valueBase64: string, serviceUuid?: string, charUuid?: string) => {
    try {
      const buf = Buffer.from(valueBase64, 'base64');
      if (!buf || buf.length === 0) return null;
      if (isMostlyPrintableAscii(buf)) return null;

      const hr = parseHeartRate(valueBase64);
      if (typeof hr === 'number') return { heartRate: hr };

      const spo2 = parseSpO2(valueBase64);
      if (typeof spo2 === 'number') return { oxygenSaturation: spo2 };

      const bp = parseBloodPressure(valueBase64);
      if (bp) return { bloodPressure: bp };

      if (buf.length >= 4) {
        try {
          const steps32 = buf.readUInt32LE(0);
          if (steps32 > 0 && steps32 < 10000000) return { steps: steps32 };
        } catch {}
      }

      // single byte — only accept as battery if characteristic/service is battery
      if (buf.length === 1) {
        const v = buf.readUInt8(0);
        const service = (serviceUuid || '').toLowerCase();
        const c = (charUuid || '').toLowerCase();
        const isBattery = service.includes('180f') || c.includes('2a19');
        if (isBattery && v >= 0 && v <= 100) return { battery: v };
        console.log(`[BLE] Ignored single-byte vendor value (svc=${serviceUuid}, char=${charUuid}):`, v);
        return null;
      }

      return null;
    } catch {
      return null;
    }
  };

  // ---------- device info logging helper ----------
  // logs services and characteristics to help identify correct UUIDs
  const logDeviceInfo = useCallback(async (device: Device) => {
    try {
      console.log('Discovering all services & characteristics (logDeviceInfo) ...');
      // ensure discovery called
      await device.discoverAllServicesAndCharacteristics().catch(() => null);

      // some implementations: device.services() returns array of Service objects
      const services: any[] = (device as any).services ? await (device as any).services() : [];
      console.log(`logDeviceInfo: found ${services.length} services`);
      for (const svc of services) {
        try {
          console.log(`Service: ${svc.uuid} (primary=${svc.isPrimary ?? 'unknown'})`);
          const chars: any[] = svc.characteristics ? await svc.characteristics() : [];
          console.log(`  Characteristics (${chars.length}):`);
          for (const c of chars) {
            const flags = [
              c.isReadable ? 'R' : '',
              (c.isWritableWithoutResponse || c.isWritable) ? 'W' : '',
              c.isNotifiable ? 'N' : ''
            ].filter(Boolean).join('');
            console.log(`   - ${c.uuid} (${flags || 'none'})`);
          }
        } catch (e) {
          console.warn('Error reading characteristics for service', svc.uuid, e);
        }
      }
    } catch (e) {
      console.warn('logDeviceInfo error', e);
    }
  }, []);

  // ---------- scanning ----------
  const startScan = useCallback(async () => {
    const mgr = bleManagerRef.current;
    if (!mgr) return;
    if (isScanning) return;

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
      mgr.startDeviceScan(null, { allowDuplicates: false }, (err, dev) => {
        if (!isMounted.current) return;
        if (err) {
          handleMonitorError(err, 'Scan');
          stopScan();
          return;
        }
        if (dev && dev.id) {
          setDevices(prev => (prev.some(d => d.id === dev.id) ? prev : [...prev, dev]));
        }
      });

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        try { mgr.stopDeviceScan(); } catch (_) {}
        if (!isMounted.current) return;
        setIsScanning(false);
        safeSetWatchData(prev => ({ ...prev, status: prev.status === 'connected' ? 'connected' : 'disconnected' }));
        scanTimeoutRef.current = null;
      }, 10000);
    } catch (e) {
      handleMonitorError(e, 'startScan');
      setIsScanning(false);
      safeSetWatchData({ status: 'error' });
    }
  }, [checkLocationServices, isScanning, showLocationServicesAlert, stopScan]);

  // ---------- connect & monitor ----------
  const connectToDevice = useCallback(async (device: Device) => {
    const mgr = bleManagerRef.current;
    if (!mgr) return false;

    try {
      // ensure Bluetooth powered on (best-effort)
      try {
        await withRetry(async () => {
          const state = await mgr.state();
          if (!(state === BleState.PoweredOn || String(state).toLowerCase() === 'poweredon')) {
            throw new Error('Bluetooth not powered on');
          }
          return state;
        }, 2);
      } catch (e) {
        // proceed but warn
        console.warn('Bluetooth state check non-fatal:', e);
      }

      stopScan();
      safeSetWatchData({ status: 'connecting' });

      const connected = await withRetry(() => device.connect(), 3, 400);
      // ensure services discovered
      await connected.discoverAllServicesAndCharacteristics().catch(() => null);
      connectedDeviceRef.current = connected;

      // log services/characteristics to help identify correct UUIDs
      logDeviceInfo(connected).catch(() => null);

      // basic info
      const deviceName = device.name ?? device.id;
      let deviceType: DeviceType = 'generic';
      const nameLower = (device.name ?? '').toLowerCase();
      if (nameLower.includes('mi band') || nameLower.includes('miband') || nameLower.includes('mi')) deviceType = 'miband';
      else if (nameLower.includes('amazfit')) deviceType = 'amazfit';
      else if (nameLower.includes('firebolt')) deviceType = 'firebolt';

      safeSetWatchData(prev => ({ ...prev, status: 'connected', deviceName, deviceType, lastUpdated: new Date() }));

      // read RSSI if available
      try {
        const rr: any = (connected as any).readRSSI ? await (connected as any).readRSSI() : null;
        const rssi = typeof rr === 'number' ? rr : rr?.rssi ?? null;
        if (rssi !== null) safeSetWatchData({ rssi });
      } catch { /* ignore */ }

      // read battery once (standard)
      try {
        const batteryChar = await withRetry(async () => {
          return await connected.readCharacteristicForService('180F', '2A19').catch(() => null);
        }, 2);
        if (batteryChar?.value) {
          const level = Buffer.from(batteryChar.value, 'base64').readUInt8(0);
          if (level >= 0 && level <= 100) safeSetWatchData({ battery: level, lastUpdated: new Date() });
        }
      } catch (e) {
        console.warn('Battery read non-fatal error', e);
      }

      // helper: battery hysteresis using batteryRef
      const maybeUpdateBattery = (newLevel: number, fromBatteryChar = false) => {
        const prev = batteryRef.current;
        if (typeof prev === 'number') {
          if (fromBatteryChar) {
            safeSetWatchData({ battery: clamp(newLevel, 0, 100), lastUpdated: new Date() });
            return;
          }
          const diff = Math.abs(prev - newLevel);
          if (newLevel >= 20 || diff <= 20) {
            safeSetWatchData({ battery: clamp(newLevel, 0, 100), lastUpdated: new Date() });
          } else {
            console.log('[BLE] Ignored implausible battery jump', { prev, newLevel, diff, fromBatteryChar });
          }
        } else {
          if (newLevel >= 0 && newLevel <= 100) safeSetWatchData({ battery: clamp(newLevel, 0, 100), lastUpdated: new Date() });
        }
      };

      // monitor wrappers: DO NOT use async/await inside the callback signature (avoid returning Promises to native)
      try {
        const hrMon = connected.monitorCharacteristicForService('180D', '2A37', (error: any, characteristic: Characteristic | null) => {
          try {
            if (!isMounted.current) return;
            if (error) { handleMonitorError(error, 'HR'); return; }
            if (characteristic?.value) {
              const parsed = parseHeartRate(characteristic.value);
              if (typeof parsed === 'number') safeSetWatchData({ heartRate: parsed, lastUpdated: new Date() });
            }
          } catch (cbErr) { handleMonitorError(cbErr, 'HR callback'); }
        });
        monitorsRef.current.push({ cancel: () => { try { (hrMon as any).remove?.(); (hrMon as any).cancel?.(); } catch (_) {} } });
      } catch (e) { handleMonitorError(e, 'HR monitor setup'); }

      try {
        const spo2Mon = connected.monitorCharacteristicForService('1822', '2A5F', (error: any, characteristic: Characteristic | null) => {
          try {
            if (!isMounted.current) return;
            if (error) { handleMonitorError(error, 'SpO2'); return; }
            if (characteristic?.value) {
              const parsed = parseSpO2(characteristic.value);
              if (typeof parsed === 'number') safeSetWatchData({ oxygenSaturation: parsed, lastUpdated: new Date() });
            }
          } catch (cbErr) { handleMonitorError(cbErr, 'SpO2 callback'); }
        });
        monitorsRef.current.push({ cancel: () => { try { (spo2Mon as any).remove?.(); (spo2Mon as any).cancel?.(); } catch (_) {} } });
      } catch (e) { handleMonitorError(e, 'SpO2 monitor setup'); }

      try {
        const bpMon = connected.monitorCharacteristicForService('1810', '2A35', (error: any, characteristic: Characteristic | null) => {
          try {
            if (!isMounted.current) return;
            if (error) { handleMonitorError(error, 'BP'); return; }
            if (characteristic?.value) {
              const parsedBP = parseBloodPressure(characteristic.value);
              if (parsedBP) safeSetWatchData({ bloodPressure: parsedBP, lastUpdated: new Date() });
            }
          } catch (cbErr) { handleMonitorError(cbErr, 'BP callback'); }
        });
        monitorsRef.current.push({ cancel: () => { try { (bpMon as any).remove?.(); (bpMon as any).cancel?.(); } catch (_) {} } });
      } catch (e) { handleMonitorError(e, 'BP monitor setup'); }

      // vendor characteristics: subscribe to notifiable vendor chars but do not treat single-byte vendor values as battery
      try {
        const services: any[] = (connected as any).services ? await (connected as any).services() : [];
        for (const s of services) {
          try {
            const chars: any[] = s.characteristics ? await s.characteristics() : [];
            for (const c of chars) {
              const charUuid = (c.uuid || '').toLowerCase();
              if (charUuid.includes('2a37') || charUuid.includes('2a19') || charUuid.includes('2a5f') || charUuid.includes('2a35')) continue;
              const isNotifiable = !!(c.isNotifiable || c.isNotifying || (c.properties && (c.properties.includes?.('Notify') || c.properties.includes?.('notify'))));
              if (!isNotifiable) continue;
              try {
                const sub = connected.monitorCharacteristicForService(s.uuid, c.uuid, (err: any, char: Characteristic | null) => {
                  try {
                    if (!isMounted.current) return;
                    if (err) { handleMonitorError(err, `Generic ${s.uuid}/${c.uuid}`); return; }
                    if (!char?.value) return;
                    const generic = parseGenericNotification(char.value, s.uuid, c.uuid);
                    if (generic) {
                      if ((generic as any).battery !== undefined) {
                        // only accept battery if from official battery char/service
                        maybeUpdateBattery((generic as any).battery, (s.uuid || '').toLowerCase().includes('180f') || (c.uuid || '').toLowerCase().includes('2a19'));
                      } else {
                        safeSetWatchData({ ...generic, lastUpdated: new Date() });
                      }
                    }
                  } catch (cbErr) { handleMonitorError(cbErr, `Generic callback ${s.uuid}/${c.uuid}`); }
                });
                monitorsRef.current.push({ cancel: () => { try { (sub as any).remove?.(); (sub as any).cancel?.(); } catch (_) {} } });
              } catch (e) {
                console.warn('Generic monitor setup failed for', s.uuid, c.uuid, e);
              }
            }
          } catch (e) {
            // ignore per-service failures
          }
        }
      } catch (e) {
        console.warn('services enumeration failed (non-fatal):', e);
      }

      return true;
    } catch (e) {
      handleMonitorError(e, 'connectToDevice');
      return false;
    }
  }, [stopScan, logDeviceInfo]);

  // ---------- disconnect ----------
  const disconnectDevice = useCallback(async () => {
    try {
      stopScan();
      clearAllMonitors();
      try {
        if (connectedDeviceRef.current) {
          await connectedDeviceRef.current.cancelConnection().catch(() => null);
        }
      } catch (_) {}
      connectedDeviceRef.current = null;
      safeSetWatchData({ status: 'disconnected' });
      setDevices([]);
      setIsScanning(false);
    } catch (e) {
      console.error('Disconnect error', e);
    }
  }, [stopScan]);

  // ---------- sync to Supabase (runs outside monitor callbacks) ----------
  const syncToSupabase = useCallback(async () => {
    if (watchData.status !== 'connected' || !watchData.deviceName) {
      return { success: false, error: 'No device connected' };
    }
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('User not authenticated');
      const result = await saveHealthMetrics(user.id, watchData);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error syncing to Supabase:', error);
      return { success: false, error: error?.message ?? String(error) };
    }
  }, [watchData]);

  // auto-sync effect: debounce + only when meaningful changes present
  useEffect(() => {
    const autoSync = async () => {
      if (watchData.status === 'connected' && watchData.deviceName && watchData.lastUpdated) {
        try {
          setIsSyncing(true);
          setSyncError(null);

          const hasHealthData = watchData.heartRate !== undefined || watchData.bloodPressure !== undefined || watchData.oxygenSaturation !== undefined || watchData.steps !== undefined || watchData.battery !== undefined;
          if (!hasHealthData) return;

          const res = await syncToSupabase();
          if (res.success) setLastSync(new Date());
          else setSyncError(res.error ?? 'Failed to sync');
        } catch (err) {
          console.error('Auto-sync error', err);
          setSyncError(err instanceof Error ? err.message : 'Unknown sync error');
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const timer = setTimeout(() => {
      if (watchData.lastUpdated) autoSync();
    }, 800);
    return () => clearTimeout(timer);
  }, [watchData, syncToSupabase]);

  // ---------- manager lifecycle ----------
  useEffect(() => {
    if (!bleManagerRef.current) {
      try { bleManagerRef.current = new BleManager(); } catch (e) { console.error('BleManager init failed', e); }
    }
    const mgr = bleManagerRef.current;
    isMounted.current = true;

    // subscribe to BLE state changes
    let sub: { remove?: () => void } | null = null;
    try {
      sub = mgr?.onStateChange((state) => {
        try {
          if (!isMounted.current) return;
          if (String(state).toLowerCase() === 'poweredoff' || state === BleState.PoweredOff) {
            Alert.alert('Bluetooth is Off', 'Please enable Bluetooth to connect to devices.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]);
          }
        } catch (err) { console.warn('stateChange handler error', err); }
      }, true) ?? null;
    } catch (e) {
      console.warn('onStateChange subscription failed', e);
    }

    return () => {
      isMounted.current = false;
      if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
      try { mgr?.stopDeviceScan(); } catch (_) {}
      clearAllMonitors();
      try { mgr?.destroy(); } catch (_) {}
      if (sub?.remove) try { sub.remove(); } catch (_) {}
      bleManagerRef.current = null;
    };
  }, []);

  // cleanup monitors on unmount too
  useEffect(() => {
    return () => {
      clearAllMonitors();
      try { bleManagerRef.current?.stopDeviceScan(); } catch (_) {}
    };
  }, []);

  // expose API
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
    syncToSupabase,
    syncDeviceData: async () => {
      // simple on-demand refresh (reads battery only)
      try {
        if (!connectedDeviceRef.current) return { success: false, error: 'No connected device' };
        const dev = connectedDeviceRef.current;
        const batteryChar = await dev.readCharacteristicForService('180F', '2A19').catch(() => null);
        if (batteryChar?.value) {
          const level = Buffer.from(batteryChar.value, 'base64').readUInt8(0);
          if (level >= 0 && level <= 100) safeSetWatchData({ battery: level, lastUpdated: new Date() });
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message ?? String(err) };
      }
    },
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
