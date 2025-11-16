import { useRef, useState, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export type DeviceType = 'firebolt' | 'miband' | 'amazfit' | 'generic';

export interface WatchData {
  // Device Info
  deviceName?: string;
  deviceType?: DeviceType;
  macAddress?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  
  // Health Metrics
  heartRate?: number;
  steps?: number;
  calories?: number;
  distance?: number; // in meters
  battery?: number;
  oxygenSaturation?: number; // SpO2
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  sleepData?: {
    deepSleep: number; // minutes
    lightSleep: number; // minutes
    remSleep: number; // minutes
    awake: number; // minutes
  };
  
  // Status
  status: 'disconnected' | 'connecting' | 'connected';
  error?: string;
  lastUpdated?: string;
  rssi?: number; // Signal strength
  
  // Activity Data
  activityType?: 'walking' | 'running' | 'cycling' | 'sleeping' | 'idle';
  activityData?: {
    startTime: string;
    endTime?: string;
    duration: number; // seconds
    heartRateSamples?: Array<{
      value: number;
      timestamp: string;
    }>;
    gpsData?: Array<{
      latitude: number;
      longitude: number;
      timestamp: string;
      altitude?: number;
      speed?: number;
    }>;
  };
}

interface DeviceService {
  serviceUuid: string;
  characteristicUuids: {
    [key: string]: string;
  };
  name: string;
  type: DeviceType;
}

// Supported device configurations
const DEVICE_SERVICES: DeviceService[] = [
  {
    name: 'FireBolt',
    type: 'firebolt',
    serviceUuid: '0000fee0-0000-1000-8000-00805f9b34fb',
    characteristicUuids: {
      deviceInfo: '0000ff01-0000-1000-8000-00805f9b34fb',
      battery: '0000ff0c-0000-1000-8000-00805f9b34fb',
      steps: '0000ff06-0000-1000-8000-00805f9b34fb',
      heartRate: '0000ff07-0000-1000-8000-00805f9b34fb',
      activity: '0000ff0d-0000-1000-8000-00805f9b34fb',
    },
  },
  {
    name: 'Mi Band',
    type: 'miband',
    serviceUuid: '0000fee0-0000-1000-8000-00805f9b34fb',
    characteristicUuids: {
      deviceInfo: '0000ff01-0000-1000-8000-00805f9b34fb',
      battery: '0000ff0c-0000-1000-8000-00805f9b34fb',
      steps: '0000ff06-0000-1000-8000-00805f9b34fb',
      heartRate: '0000ff07-0000-1000-8000-00805f9b34fb',
      activity: '0000ff0d-0000-1000-8000-00805f9b34fb',
    },
  },
  {
    name: 'Amazfit',
    type: 'amazfit',
    serviceUuid: '0000fee0-0000-1000-8000-00805f9b34fb',
    characteristicUuids: {
      deviceInfo: '0000ff01-0000-1000-8000-00805f9b34fb',
      battery: '0000ff0c-0000-1000-8000-00805f9b34fb',
      steps: '0000ff06-0000-1000-8000-00805f9b34fb',
      heartRate: '0000ff07-0000-1000-8000-00805f9b34fb',
      activity: '0000ff0d-0000-1000-8000-00805f9b34fb',
    },
  },
];

export const useFireBoltWatch = () => {
  const [devices, setDevices] = useState<Array<{
    id: string;
    name: string;
    rssi?: number;
  }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  
  const [watchData, setWatchData] = useState<WatchData>({
    status: 'disconnected',
  });
  
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const retryTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>('generic');
  
  // Get the current device configuration
  const getDeviceConfig = useCallback((type: DeviceType) => {
    return DEVICE_SERVICES.find(device => device.type === type) || DEVICE_SERVICES[0];
  }, []);
  
  const connectToWatch = useCallback((deviceType: DeviceType = 'generic') => {
    if (!webViewRef.current) {
      console.log('WebView ref not available');
      return false;
    }
    
    if (!webViewReady) {
      console.log('WebView not ready yet, scheduling connection for later');
      // Schedule connection attempt for when WebView is ready
      const checkReady = () => {
        if (webViewReady) {
          connectToWatch(deviceType);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
      return false;
    }
    
    // Clear any pending retry timeouts
    clearTimeout(retryTimeout.current);
    
    // Only update status if not already connecting to prevent UI flicker
    setWatchData(prev => {
      if (prev.status === 'connecting') return prev;
      return { 
        ...prev, 
        status: 'connecting', 
        error: undefined,
        deviceType,
        lastUpdated: new Date().toISOString()
      };
    });
    
    const deviceConfig = getDeviceConfig(deviceType);
    
    const connectScript = `
      (async function() {
        try {
          window.deviceType = '${deviceType}';
          window.deviceConfig = ${JSON.stringify(deviceConfig)};
          console.log('Attempting to connect to device...');
          const result = await window.connectToDevice();
          console.log('Connection result:', result);
          if (result && result.status === 'connected') {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'status',
              status: 'connected',
              deviceName: result.deviceName || 'Unknown Device'
            }));
          }
        } catch (error) {
          console.error('Connection error:', error);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'status',
            status: 'error',
            error: error.message || 'Failed to connect to device'
          }));
        }
      })();
      true;
    `;
    
    webViewRef.current.injectJavaScript(connectScript);
  }, [webViewReady, getDeviceConfig]);
  
  const retryConnection = useCallback((delay = 3000) => {
    if (!webViewReady || !watchData.deviceType) {
      console.log('Not retrying - WebView not ready or no device type selected');
      return;
    }
    
    // Only retry if we're not already connecting
    if (watchData.status === 'connecting') {
      console.log('Already connecting, skipping retry');
      return;
    }
    
    console.log(`Scheduling connection retry in ${delay}ms`);
    
    const retry = () => {
      console.log('Executing connection retry');
      connectToWatch(watchData.deviceType as DeviceType);
    };
    
    if (delay > 0) {
      retryTimeout.current = setTimeout(retry, delay);
    } else {
      retry();
    }
  }, [webViewReady, connectToWatch, watchData.deviceType, watchData.status]);
  
  const handleWebViewLoad = useCallback(() => {
    console.log('WebView loaded, setting ready state');
    setWebViewReady(true);
    
    // Send a ready message to the WebView
    const initScript = `
      console.log('WebView initialized');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'webview_ready' }));
      true;
    `;
    
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(initScript);
    }
  }, []);
  
  const handleError = useCallback((event: { nativeEvent: { description: string } }) => {
    console.error('WebView error:', event.nativeEvent.description);
    setWatchData(prev => ({
      ...prev,
      status: 'disconnected',
      error: 'Connection error. Please try again.',
      lastUpdated: new Date().toISOString()
    }));
  }, []);
  
  const startScan = useCallback(() => {
    if (!webViewRef.current) return;
    
    console.log('Starting BLE scan...');
    setIsScanning(true);
    setDevices([]);
    
    const scanScript = `
      window.startScanning();
      true;
    `;
    
    webViewRef.current.injectJavaScript(scanScript);
  }, []);
  
  const connectToDevice = useCallback((deviceId: string) => {
    if (!webViewRef.current) return;
    
    console.log('Connecting to device:', deviceId);
    
    const connectScript = `
      const device = window.foundDevices?.find(d => d.id === '${deviceId}');
      if (device) {
        window.connectToDevice(device);
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: 'Device not found. Please scan again.'
        }));
      }
      true;
    `;
    
    webViewRef.current.injectJavaScript(connectScript);
  }, []);
  
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const timestamp = new Date().toISOString();
      
      console.log('Received message from WebView:', data);
      
      // Handle device scanning
      if (data.type === 'deviceFound') {
        setDevices(prevDevices => {
          // Check if device already exists
          const exists = prevDevices.some(d => d.id === data.device.id);
          if (!exists) {
            return [...prevDevices, data.device];
          }
          return prevDevices;
        });
        return;
      }
      
      // Handle scan started
      if (data.type === 'scanStarted') {
        setIsScanning(true);
        return;
      }
      
      // Handle device selected
      if (data.type === 'deviceSelected') {
        setWatchData(prev => ({
          ...prev,
          status: 'connecting',
          deviceName: data.device?.name || 'Unknown Device',
          lastUpdated: timestamp
        }));
        return;
      }
      
      // Handle connected
      if (data.type === 'connected') {
        setWatchData(prev => ({
          ...prev,
          status: 'connected',
          deviceName: data.device?.name || 'Unknown Device',
          rssi: data.device?.rssi,
          lastUpdated: timestamp,
          error: undefined
        }));
        setIsScanning(false);
        return;
      }
      
      // Handle errors
      if (data.type === 'error') {
        setWatchData(prev => ({
          ...prev,
          status: 'disconnected',
          error: data.error || 'Connection failed',
          lastUpdated: timestamp
        }));
        setIsScanning(false);
        return;
      }
      
      // Handle different types of data updates
      if (data.type === 'deviceInfo') {
        // Update device information
        setWatchData(prev => ({
          ...prev,
          deviceName: data.deviceName,
          macAddress: data.macAddress,
          firmwareVersion: data.firmwareVersion,
          hardwareVersion: data.hardwareVersion,
          status: 'connected',
          lastUpdated: timestamp,
          error: undefined
        }));
      } 
      // Handle health metrics update
      else if (data.type === 'metrics' || data.heartRate || data.steps || data.battery) {
        setWatchData(prev => ({
          ...prev,
          ...(data.type === 'metrics' ? data.metrics : data),
          status: 'connected',
          lastUpdated: timestamp,
          error: undefined
        }));
      } 
      // Handle activity data
      else if (data.type === 'activity') {
        setWatchData(prev => ({
          ...prev,
          activityType: data.activityType,
          activityData: data.activityData,
          lastUpdated: timestamp
        }));
      }
      // Handle status updates
      else if (data.status === 'disconnected') {
        setWatchData(prev => ({
          ...prev,
          status: 'disconnected',
          lastUpdated: timestamp
        }));
        // Auto-reconnect after delay
        retryTimeout.current = setTimeout(() => {
          if (watchData.deviceType) {
            connectToWatch(watchData.deviceType);
          }
        }, 3000);
      } 
      else if (data.status === 'error') {
        setWatchData(prev => ({
          ...prev,
          status: 'disconnected',
          error: data.error || 'Connection error',
          lastUpdated: timestamp
        }));
        // Retry after delay on error
        retryTimeout.current = setTimeout(() => {
          if (watchData.deviceType) {
            connectToWatch(watchData.deviceType);
          }
        }, 5000);
      }
      // Handle raw characteristic updates
      else if (data.characteristic) {
        // Process raw characteristic data if needed
        // This is where you'd parse device-specific data formats
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error, event.nativeEvent.data);
    }
  }, [connectToWatch]);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, []);

  // Function to manually set device type and connect
 const connectToDeviceType = useCallback((deviceType: DeviceType) => {
  setSelectedDeviceType(deviceType);
  connectToWatch(deviceType);
}, [connectToWatch]);

  // Function to manually disconnect
  const disconnectDevice = useCallback(() => {
    if (webViewRef.current) {
      const disconnectScript = `
        if (window.disconnectDevice) {
          window.disconnectDevice();
        }
        true;
      `;
      webViewRef.current.injectJavaScript(disconnectScript);
    }
    
    setWatchData(prev => ({
      ...prev,
      status: 'disconnected',
      lastUpdated: new Date().toISOString()
    }));
    
    clearTimeout(retryTimeout.current);
  }, []);
  
  // Function to sync data from device
  const syncDeviceData = useCallback(() => {
    if (webViewRef.current && watchData.status === 'connected') {
      const syncScript = `
        if (window.syncDeviceData) {
          window.syncDeviceData()
            .then(data => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'metrics',
                metrics: data
              }));
            })
            .catch(error => {
              console.error('Sync error:', error);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'error',
                error: 'Failed to sync data: ' + error.message
              }));
            });
        }
        true;
      `;
      webViewRef.current.injectJavaScript(syncScript);
    }
  }, [watchData.status]);

  return {
    watchData,
    webViewRef,
    handleMessage,
    handleError,
    handleWebViewLoad,
    retryConnection,
    connectToDevice,
    connectToDeviceType,
    disconnectDevice,
    syncDeviceData,
    selectedDeviceType,
    setSelectedDeviceType,
    deviceTypes: DEVICE_SERVICES.map(s => ({
      type: s.type,
      name: s.name
    }))
  };
};
