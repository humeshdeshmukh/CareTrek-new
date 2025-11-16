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

type CharFlags = { uuid: string; isReadable?: boolean; isWritable?: boolean; isNotifiable?: boolean; };

export const useBLEWatch = () => {
  const [watchData, setWatchData] = useState<WatchData>({ status: 'disconnected' });
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

  // ---------- utilities ----------
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
    // For monitor-level errors we log only (non-fatal). For connection-level errors we set status later.
    return { message, code, reason };
  };

  const withRetry = async <T,>(op: () => Promise<T>, tries = 3, base = 400): Promise<T> => {
    let last: any;
    for (let i = 0; i < tries; i++) {
      try { return await op(); } catch (e) { last = e; if (i < tries - 1) await new Promise(r => setTimeout(r, base * Math.pow(2, i))); }
    }
    throw last || new Error('Unknown retry error');
  };

  // ---------- parsers ----------
  const parseHeartRate = (b64: string): number | undefined => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length < 2) return undefined;
      if (isPrintableText(buf)) return undefined;
      const flags = buf.readUInt8(0);
      const is16 = (flags & 0x01) !== 0;
      const hr = is16 ? buf.readUInt16LE(1) : buf.readUInt8(1);
      if (!Number.isFinite(hr) || hr < 30 || hr > 220) return undefined;
      return clamp(hr, 30, 220);
    } catch { return undefined; }
  };

  const parseSpO2 = (b64: string): number | undefined => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length === 0) return undefined;
      if (isPrintableText(buf)) return undefined;
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
    } catch { return undefined; }
  };

  const parseBloodPressure = (b64: string): { systolic: number; diastolic: number } | undefined => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length < 4) return undefined;
      if (isPrintableText(buf)) return undefined;
      const sys = buf.readUInt16LE(0);
      const dia = buf.readUInt16LE(2);
      if (!Number.isFinite(sys) || !Number.isFinite(dia)) return undefined;
      if (sys < 70 || sys > 260 || dia < 40 || dia > 200 || sys <= dia) return undefined;
      return { systolic: clamp(sys, 70, 260), diastolic: clamp(dia, 40, 200) };
    } catch { return undefined; }
  };

  const parseGeneric = (b64: string, svc?: string, char?: string) => {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!buf || buf.length === 0) return null;
      if (isPrintableText(buf)) return null;
      const hr = parseHeartRate(b64); if (typeof hr === 'number') return { heartRate: hr };
      const spo2 = parseSpO2(b64); if (typeof spo2 === 'number') return { oxygenSaturation: spo2 };
      const bp = parseBloodPressure(b64); if (bp) return { bloodPressure: bp };
      if (buf.length >= 4) {
        try { const s = buf.readUInt32LE(0); if (s > 0 && s < 1e7) return { steps: s }; } catch {}
      }
      if (buf.length === 1) {
        const v = buf.readUInt8(0);
        const s = (svc || '').toLowerCase(); const c = (char || '').toLowerCase();
        const isBattery = s.includes('180f') || c.includes('2a19');
        if (isBattery && v >= 0 && v <= 100) return { battery: v };
        console.log(`[BLE] Ignored single-byte vendor value svc=${svc} char=${char} val=${v}`);
        return null;
      }
      return null;
    } catch { return null; }
  };

  // ---------- discover & log device info (with flags) ----------
  const logDeviceInfo = useCallback(async (device: Device) => {
    try {
      console.log('Discovering all services & characteristics (logDeviceInfo) ...');
      await device.discoverAllServicesAndCharacteristics().catch(() => null);

      // Build maps: serviceSet, charSet, svcToChars(with flags)
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
          try {
            chars = (svc.characteristics ? await svc.characteristics() : []);
          } catch (e) { /* ignore per-service char list failure */ }

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
              // if properties present as array/string, try to detect notify/read/write
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
  }, []);

  // ---------- permissions ----------
  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
          title: 'Location Permission',
          message: 'Bluetooth Low Energy requires Location permission to scan for nearby devices',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
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
  }, []);

  const stopScan = useCallback(() => {
    try { bleManagerRef.current?.stopDeviceScan(); } catch (_) {}
    if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
    if (isMounted.current) {
      setIsScanning(false);
      safeSetWatchData(prev => ({ ...prev, status: prev.status === 'connected' ? 'connected' : 'disconnected' }));
    }
  }, []);

  // ---------- scanning ----------
  const startScan = useCallback(async () => {
    const mgr = bleManagerRef.current;
    if (!mgr) return;
    if (isScanning) return;

    const ok = await checkLocationServices();
    if (!ok) { safeSetWatchData({ status: 'error' }); return; }

    setDevices([]);
    setIsScanning(true);
    safeSetWatchData({ status: 'scanning' });

    try {
      mgr.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (!isMounted.current) return;
        if (error) { handleMonitorError(error, 'Scan'); stopScan(); return; }
        if (device && device.id) {
          setDevices(prev => (prev.some(d => d.id === device.id) ? prev : [...prev, device]));
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
    } catch (err) {
      handleMonitorError(err, 'startScan');
      safeSetWatchData({ status: 'error' });
      setIsScanning(false);
    }
  }, [checkLocationServices, isScanning, stopScan]);

  // ---------- connect & monitor (only notifiable chars) ----------
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

      const connected = await withRetry(() => device.connect(), 3, 400);
      await connected.discoverAllServicesAndCharacteristics().catch(() => null);
      connectedDeviceRef.current = connected;

      const { serviceSet, charSet, svcToChars } = await logDeviceInfo(connected);

      const deviceName = device.name ?? device.id;
      let deviceType: DeviceType = 'generic';
      const lower = (device.name ?? '').toLowerCase();
      if (lower.includes('mi band') || lower.includes('miband') || lower.includes('mi')) deviceType = 'miband';
      else if (lower.includes('amazfit')) deviceType = 'amazfit';
      else if (lower.includes('firebolt')) deviceType = 'firebolt';

      safeSetWatchData(prev => ({ ...prev, status: 'connected', deviceName, deviceType, lastUpdated: new Date() }));

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
            if (level >= 0 && level <= 100) safeSetWatchData({ battery: level, lastUpdated: new Date() });
          }
        }
      } catch (e) { console.warn('Battery read non-fatal', e); }

      const maybeUpdateBattery = (newLevel: number, fromBatteryChar = false) => {
        const prev = batteryRef.current;
        if (typeof prev === 'number') {
          if (fromBatteryChar) { safeSetWatchData({ battery: clamp(newLevel, 0, 100), lastUpdated: new Date() }); return; }
          const diff = Math.abs(prev - newLevel);
          if (newLevel >= 20 || diff <= 20) safeSetWatchData({ battery: clamp(newLevel, 0, 100), lastUpdated: new Date() });
          else console.log('[BLE] Ignored implausible battery jump', { prev, newLevel, diff, fromBatteryChar });
        } else {
          if (newLevel >= 0 && newLevel <= 100) safeSetWatchData({ battery: clamp(newLevel, 0, 100), lastUpdated: new Date() });
        }
      };

      // Helper to subscribe safely only if char flagged notifiable in svcToChars
      const subscribeIfNotifiable = (svcUuid: string, charUuid: string, handler: (char: Characteristic | null) => void) => {
        try {
          const chars = svcToChars.get(svcUuid) || [];
          const found = chars.find(c => c.uuid === charUuid);
          if (!found || !found.isNotifiable) {
            // skip if not explicitly notifiable
            return;
          }
          // avoid duplicate subscription
          const subId = `${svcUuid}:${charUuid}`;
          if (subscribedCharsRef.current.has(subId)) return;
          subscribedCharsRef.current.add(subId);

          const sub = connected.monitorCharacteristicForService(svcUuid, charUuid, (err, characteristic) => {
            try {
              if (!isMounted.current) return;
              if (err) { handleMonitorError(err, `Monitor ${svcUuid}/${charUuid}`); return; }
              handler(characteristic);
            } catch (cbErr) { handleMonitorError(cbErr, `Callback ${svcUuid}/${charUuid}`); }
          });

          monitorsRef.current.push({ id: subId, cancel: () => { try { (sub as any).remove?.(); (sub as any).cancel?.(); } catch (_) {} } });
        } catch (e) {
          // subscription attempts may throw; handle non-fatally
          handleMonitorError(e, `subscribeIfNotifiable ${svcUuid}/${charUuid}`);
        }
      };

      // Heart Rate monitor (if present + notifiable)
      if (serviceSet.has('0000180d-0000-1000-8000-00805f9b34fb')) {
        subscribeIfNotifiable('0000180d-0000-1000-8000-00805f9b34fb', '00002a37-0000-1000-8000-00805f9b34fb', (characteristic) => {
          if (!characteristic?.value) return;
          const hr = parseHeartRate(characteristic.value);
          if (typeof hr === 'number') safeSetWatchData({ heartRate: hr, lastUpdated: new Date() });
        });
      }

      // SpO2 monitor — only if service/char exist and flagged notifiable
      if (serviceSet.has('00001822-0000-1000-8000-00805f9b34fb')) {
        subscribeIfNotifiable('00001822-0000-1000-8000-00805f9b34fb', '00002a5f-0000-1000-8000-00805f9b34fb', (characteristic) => {
          if (!characteristic?.value) return;
          const s = parseSpO2(characteristic.value);
          if (typeof s === 'number') safeSetWatchData({ oxygenSaturation: s, lastUpdated: new Date() });
        });
      }

      // Blood Pressure monitor
      if (serviceSet.has('00001810-0000-1000-8000-00805f9b34fb')) {
        subscribeIfNotifiable('00001810-0000-1000-8000-00805f9b34fb', '00002a35-0000-1000-8000-00805f9b34fb', (characteristic) => {
          if (!characteristic?.value) return;
          const bp = parseBloodPressure(characteristic.value);
          if (bp) safeSetWatchData({ bloodPressure: bp, lastUpdated: new Date() });
        });
      }

      // Vendor/generic monitors: only subscribe to those flagged isNotifiable
      try {
        for (const [svcUuid, charList] of Array.from(svcToChars.entries())) {
          for (const c of charList) {
            const lowChar = c.uuid;
            // skip already-handled standard ones
            if (['00002a37-0000-1000-8000-00805f9b34fb','00002a19-0000-1000-8000-00805f9b34fb','00002a5f-0000-1000-8000-00805f9b34fb','00002a35-0000-1000-8000-00805f9b34fb'].includes(lowChar)) continue;
            if (!c.isNotifiable) continue;
            // subscribe
            subscribeIfNotifiable(svcUuid, lowChar, (characteristic) => {
              if (!characteristic?.value) return;
              const generic = parseGeneric(characteristic.value, svcUuid, lowChar);
              if (generic) {
                if ((generic as any).battery !== undefined) {
                  // accept battery only from official battery char; else ignore
                  if (svcUuid.includes('180f') || lowChar.includes('2a19')) maybeUpdateBattery((generic as any).battery, true);
                } else {
                  safeSetWatchData({ ...generic, lastUpdated: new Date() });
                }
              }
            });
          }
        }
      } catch (e) {
        console.warn('Vendor monitors enumeration non-fatal', e);
      }

      return true;
    } catch (error) {
      handleMonitorError(error, 'connectToDevice');
      safeSetWatchData({ status: 'error' });
      return false;
    }

    // local helper inside connect for battery mayUpdate
    function maybeUpdateBattery(newLevel: number, fromBatteryChar = false) {
      const prev = batteryRef.current;
      if (typeof prev === 'number') {
        if (fromBatteryChar) { safeSetWatchData({ battery: clamp(newLevel, 0, 100), lastUpdated: new Date() }); return; }
        const diff = Math.abs(prev - newLevel);
        if (newLevel >= 20 || diff <= 20) safeSetWatchData({ battery: clamp(newLevel, 0, 100), lastUpdated: new Date() });
        else console.log('[BLE] Ignored implausible battery jump', { prev, newLevel, diff, fromBatteryChar });
      } else {
        if (newLevel >= 0 && newLevel <= 100) safeSetWatchData({ battery: clamp(newLevel, 0, 100), lastUpdated: new Date() });
      }
    }
  }, [logDeviceInfo, stopScan]);

  // ---------- disconnect ----------
  const disconnectDevice = useCallback(async () => {
    try {
      stopScan();
      clearAllMonitors();
      try { if (connectedDeviceRef.current) await connectedDeviceRef.current.cancelConnection().catch(() => null); } catch (_) {}
      connectedDeviceRef.current = null;
      safeSetWatchData({ status: 'disconnected' });
      setDevices([]); setIsScanning(false);
    } catch (e) { console.error('Disconnect error', e); }
  }, [stopScan]);

  // ---------- sync (outside callbacks) ----------
  const syncToSupabase = useCallback(async () => {
    if (watchData.status !== 'connected' || !watchData.deviceName) return { success: false, error: 'No device connected' };
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!user) throw new Error('Not authenticated');
      const res = await saveHealthMetrics(user.id, watchData);
      return { success: true, data: res };
    } catch (e: any) {
      console.error('syncToSupabase failed', e);
      return { success: false, error: e?.message ?? String(e) };
    }
  }, [watchData]);

  // Auto-sync (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (watchData.status === 'connected' && watchData.deviceName && watchData.lastUpdated) {
        try {
          setIsSyncing(true);
          setSyncError(null);
          const has = watchData.heartRate !== undefined || watchData.oxygenSaturation !== undefined || watchData.bloodPressure !== undefined || watchData.steps !== undefined || watchData.battery !== undefined;
          if (!has) return;
          const res = await syncToSupabase();
          if (res.success) setLastSync(new Date()); else setSyncError(res.error ?? 'Sync failed');
        } catch (e) {
          console.error('Auto-sync error', e);
          setSyncError(e instanceof Error ? e.message : 'Unknown');
        } finally { setIsSyncing(false); }
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
  }, []);

  // defensive cleanup
  useEffect(() => {
    return () => {
      clearAllMonitors();
      try { bleManagerRef.current?.stopDeviceScan(); } catch (_) {}
    };
  }, []);

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
        if (batt?.value) { const lvl = Buffer.from(batt.value, 'base64').readUInt8(0); if (lvl >= 0 && lvl <= 100) safeSetWatchData({ battery: lvl, lastUpdated: new Date() }); }
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
