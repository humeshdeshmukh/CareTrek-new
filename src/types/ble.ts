import { Device } from 'react-native-ble-plx';

export type DeviceType = 'miband' | 'amazfit' | 'firebolt' | 'generic';

export interface WatchData {
  status: 'connected' | 'disconnected' | 'connecting' | 'scanning' | 'error';
  deviceId?: string;
  deviceName?: string;
  deviceType?: DeviceType;
  heartRate?: number;
  steps?: number;
  battery?: number;
  oxygenSaturation?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  } | null;
  calories?: number;
  lastUpdated?: Date;
  firmwareVersion?: string;
  hardwareVersion?: string;
  rssi?: number | null;
  [key: string]: any;
}

export interface BLEDevice extends Device {
  // Add any additional properties you need
}
