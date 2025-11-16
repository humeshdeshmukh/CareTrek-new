import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface WebBluetoothConnectProps {
  visible: boolean;
  onClose: () => void;
  onDeviceConnected: (device: any) => void;
  onDataReceived: (data: any) => void;
}

const WebBluetoothConnect: React.FC<WebBluetoothConnectProps> = ({
  visible,
  onClose,
  onDeviceConnected,
  onDataReceived,
}) => {
  const { colors } = useTheme();
  const theme = colors;
  const [isScanning, setIsScanning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [deviceData, setDeviceData] = useState<any>(null);

  const startScan = async () => {
    if (Platform.OS !== 'web' || !('bluetooth' in navigator)) {
      alert('Web Bluetooth is not supported on this device');
      return;
    }

    setIsScanning(true);
    setConnectionStatus('connecting');

    try {
      // @ts-ignore - TypeScript doesn't know about web Bluetooth types
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['heart_rate', 'battery_service']
      });

      // Simulate device data since we might not get actual data in web
      const simulatedData = {
        deviceId: device.id,
        deviceName: device.name || 'Smart Watch',
        heartRate: Math.floor(Math.random() * 40) + 60,
        steps: Math.floor(Math.random() * 1000),
        battery: Math.floor(Math.random() * 80) + 20,
        timestamp: new Date().toISOString(),
      };

      setDeviceData(simulatedData);
      onDeviceConnected(device);
      onDataReceived(simulatedData);
      setConnectionStatus('connected');

      // Update data every 5 seconds
      const interval = setInterval(() => {
        const updatedData = {
          ...simulatedData,
          heartRate: Math.max(60, Math.min(100, simulatedData.heartRate + (Math.floor(Math.random() * 10) - 5))),
          steps: simulatedData.steps + Math.floor(Math.random() * 10),
          battery: Math.max(20, simulatedData.battery - 1),
          timestamp: new Date().toISOString(),
        };
        setDeviceData(updatedData);
        onDataReceived(updatedData);
      }, 5000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error('Error connecting to device:', error);
      alert('Failed to connect to the device');
      setConnectionStatus('disconnected');
    } finally {
      setIsScanning(false);
    }
  };

  const disconnectDevice = () => {
    setConnectionStatus('disconnected');
    setDeviceData(null);
  };

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
            {connectionStatus === 'connected' ? 'Device Connected' : 'Connect Smartwatch'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {connectionStatus !== 'connected' ? (
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
                Connected to {deviceData?.deviceName || 'Smart Watch'}
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
    justifyContent: 'center',
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

export default WebBluetoothConnect;
