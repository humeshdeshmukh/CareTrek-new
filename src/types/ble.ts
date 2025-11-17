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
  // New fields for sleep and hydration
  sleepData?: {
    duration: number; // in minutes
    quality: 'poor' | 'fair' | 'good' | 'excellent'; // sleep quality
    deepSleep: number; // in minutes
    lightSleep: number; // in minutes
    remSleep: number; // in minutes
    awakeTime: number; // in minutes
    timestamp: Date;
  } | null;
  hydration?: {
    waterIntake: number; // in ml
    goal: number; // daily goal in ml
    timestamp: Date;
  } | null;
  lastUpdated?: Date;
  firmwareVersion?: string;
  hardwareVersion?: string;
  rssi?: number | null;
  [key: string]: any;
}

export interface BLEDevice extends Device {
  // Add any additional properties you need
}
