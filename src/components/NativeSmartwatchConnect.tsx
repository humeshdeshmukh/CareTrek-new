import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Alert
} from 'react-native';
import { useTheme } from '../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BleManager, Device, State } from 'react-native-ble-plx';

// Initialize Bluetooth Low Energy Manager
const manager = new BleManager();

interface NativeSmartwatchConnectProps {
  visible: boolean;
  onClose: () => void;
  onDeviceConnected: (device: Device) => void;
  onDataReceived: (data: any) => void;
}

const NativeSmartwatchConnect: React.FC<NativeSmartwatchConnectProps> = ({
  visible,
  onClose,
  onDeviceConnected,
  onDataReceived
}) => {
  const { colors } = useTheme();
  const theme = colors;
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [deviceData, setDeviceData] = useState<any>(null);

  // Request Bluetooth permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Bluetooth requires location permission to scan for devices',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Start scanning for BLE devices
  const startScan = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission required', 'Location permission is required to scan for devices');
      return;
    }

    setDevices([]);
    setIsScanning(true);
    
    // Start scanning
    manager.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error: any, device: Device | null) => {
        if (error) {
          console.error(error);
          setIsScanning(false);
          return;
        }

        // Only add devices with names (most smartwatches will have a name)
        if (device?.name) {
          setDevices(prevDevices => {
            // Check if device is already in the list
            if (!prevDevices.some(d => d.id === device.id)) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      }
    );

    // Stop scanning after 10 seconds
    setTimeout(() => {
      stopScan();
    }, 10000);
  };

  // Stop scanning for BLE devices
  const stopScan = () => {
    manager.stopDeviceScan();
    setIsScanning(false);
  };

  // Connect to a device
  const connectToDevice = async (device: Device) => {
    try {
      setConnectionStatus('connecting');
      
      // Connect to the device
      const deviceConnection = await device.connect();
      
      // Discover all services and characteristics
      await deviceConnection.discoverAllServicesAndCharacteristics();
      
      setConnectedDevice(deviceConnection);
      setConnectionStatus('connected');
      onDeviceConnected(deviceConnection);
      
      // Simulate device data (replace with actual BLE communication)
      simulateDeviceData(deviceConnection);
      
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      Alert.alert('Connection Error', 'Failed to connect to the device');
    }
  };

  // Simulate device data (replace with actual BLE communication)
  const simulateDeviceData = (device: Device) => {
    const heartRate = Math.floor(Math.random() * 40) + 60;
    const steps = Math.floor(Math.random() * 20000);
    const battery = Math.floor(Math.random() * 80) + 20;
    
    const data = {
      deviceId: device.id,
      deviceName: device.name || 'Smart Watch',
      heartRate,
      steps,
      battery,
      timestamp: new Date().toISOString(),
    };
    
    setDeviceData(data);
    onDataReceived(data);
    
    // Update data every 5 seconds
    const interval = setInterval(() => {
      const updatedData = {
        ...data,
        heartRate: Math.max(60, Math.min(100, heartRate + (Math.floor(Math.random() * 10) - 5))),
        steps: steps + Math.floor(Math.random() * 10),
        battery: Math.max(20, battery - 1),
        timestamp: new Date().toISOString(),
      };
      
      setDeviceData(updatedData);
      onDataReceived(updatedData);
    }, 5000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  };

  // Disconnect from the current device
  const disconnectDevice = async () => {
    if (connectedDevice) {
      try {
        await connectedDevice.cancelConnection();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    setConnectedDevice(null);
    setConnectionStatus('disconnected');
    setDeviceData(null);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        stopScan();
      }
      if (connectedDevice) {
        disconnectDevice();
      }
    };
  }, []);

  // Render a single device item
  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={[styles.deviceItem, { backgroundColor: theme.card }]}
      onPress={() => connectToDevice(item)}
      disabled={connectionStatus === 'connecting'}
    >
      <Ionicons 
        name="watch" 
        size={24} 
        color={theme.primary} 
        style={styles.deviceIcon} 
      />
      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceName, { color: theme.text }]}>
          {item.name || 'Unknown Device'}
        </Text>
        <Text style={[styles.deviceId, { color: theme.textSecondary }]}>
          {item.id}
        </Text>
      </View>
      {connectionStatus === 'connecting' ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <Ionicons 
          name="add-circle" 
          size={24} 
          color={theme.primary} 
        />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>
            {connectedDevice ? 'Device Connected' : 'Connect Smartwatch'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {!connectedDevice ? (
          <View style={styles.scanContainer}>
            <Text style={[styles.instructions, { color: theme.text }]}>
              {isScanning 
                ? 'Searching for nearby devices...' 
                : 'Make sure your smartwatch is in pairing mode and nearby.'}
            </Text>
            
            {isScanning ? (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.scanningText, { color: theme.text }]}>
                  Scanning...
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.scanButton, { backgroundColor: theme.primary }]}
                onPress={startScan}
              >
                <Ionicons name="bluetooth" size={24} color="white" />
                <Text style={styles.scanButtonText}>Scan for Devices</Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={devices}
              renderItem={renderDeviceItem}
              keyExtractor={(item) => item.id}
              style={styles.deviceList}
              contentContainerStyle={styles.deviceListContent}
              ListEmptyComponent={
                <Text style={[styles.noDevicesText, { color: theme.textSecondary }]}>
                  {isScanning 
                    ? 'Searching for devices...' 
                    : 'No devices found. Tap "Scan for Devices" to search.'}
                </Text>
              }
            />
          </View>
        ) : (
          <View style={styles.connectedContainer}>
            <View style={styles.connectedDevice}>
              <Ionicons 
                name="checkmark-circle" 
                size={64} 
                color="#4CAF50" 
                style={styles.connectedIcon} 
              />
              <Text style={[styles.connectedText, { color: theme.text }]}>
                Connected to {connectedDevice?.name || 'Smart Watch'}
              </Text>
              
              {deviceData && (
                <View style={styles.deviceData}>
                  <View style={styles.dataRow}>
                    <View style={styles.dataItem}>
                      <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>
                        Heart Rate
                      </Text>
                      <Text style={[styles.dataValue, { color: theme.primary }]}>
                        {deviceData.heartRate} <Text style={styles.dataUnit}>bpm</Text>
                      </Text>
                    </View>
                    <View style={styles.dataItem}>
                      <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>
                        Steps
                      </Text>
                      <Text style={[styles.dataValue, { color: theme.primary }]}>
                        {deviceData.steps.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dataRow}>
                    <View style={styles.dataItem}>
                      <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>
                        Battery
                      </Text>
                      <Text style={[styles.dataValue, { color: theme.primary }]}>
                        {deviceData.battery}%
                      </Text>
                    </View>
                    <View style={styles.dataItem}>
                      <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>
                        Status
                      </Text>
                      <Text style={[styles.dataValue, { color: '#4CAF50' }]}>
                        Connected
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.disconnectButton, { borderColor: theme.primary }]}
                onPress={disconnectDevice}
              >
                <Text style={[styles.disconnectButtonText, { color: theme.primary }]}>
                  Disconnect
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  scanContainer: {
    flex: 1,
    padding: 16,
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scanningIndicator: {
    alignItems: 'center',
    padding: 24,
  },
  scanningText: {
    marginTop: 16,
    fontSize: 16,
  },
  deviceList: {
    flex: 1,
  },
  deviceListContent: {
    paddingBottom: 24,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deviceIcon: {
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    opacity: 0.7,
  },
  noDevicesText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  connectedContainer: {
    flex: 1,
    padding: 24,
  },
  connectedDevice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedIcon: {
    marginBottom: 24,
  },
  connectedText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  deviceData: {
    width: '100%',
    marginBottom: 32,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dataItem: {
    flex: 1,
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: '600',
  },
  dataUnit: {
    fontSize: 14,
  },
  disconnectButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  disconnectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NativeSmartwatchConnect;
