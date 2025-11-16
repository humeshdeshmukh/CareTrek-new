import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../contexts/theme/ThemeContext';

interface LocationViewProps {
  onLocationUpdate?: (location: { latitude: number; longitude: number; address?: string }) => void;
  showActions?: boolean;
  style?: any;
}

const LocationView: React.FC<LocationViewProps> = ({
  onLocationUpdate,
  showActions = true,
  style,
}) => {
  const { colors } = useTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Get current location
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission not granted');
          return;
        }

        // Get current position
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        // Get address from coordinates
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        if (addressResponse.length > 0) {
          const addr = addressResponse[0];
          const addrStr = [
            addr.name,
            addr.street,
            addr.city,
            addr.region,
            addr.postalCode,
            addr.country,
          ]
            .filter(Boolean)
            .join(', ');
          setAddress(addrStr);
        }

        if (onLocationUpdate) {
          onLocationUpdate({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            address: address,
          });
        }
      } catch (err) {
        console.error('Error getting location:', err);
        setError('Could not get location');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleShareLocation = async () => {
    if (!location) return;

    try {
      const locationUrl = `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`;
      await Share.share({
        message: `My current location: ${locationUrl} ${address ? '\n\n' + address : ''}`,
        title: 'My Location',
      });
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Could not share location');
    }
  };

  const handleRefresh = async () => {
    setError('');
    setIsLoading(true);
    // Re-fetch location
    const currentLocation = await Location.getCurrentPositionAsync({});
    setLocation(currentLocation);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="location" size={32} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Getting your location...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="location-off" size={32} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.locationCard, { backgroundColor: colors.card }]}>
        <View style={styles.locationIcon}>
          <Ionicons name="location" size={24} color={colors.primary} />
        </View>
        
        <View style={styles.locationInfo}>
          <Text style={[styles.coordinates, { color: colors.text }]}>
            {location?.coords.latitude.toFixed(6)}, {location?.coords.longitude.toFixed(6)}
          </Text>
          
          {address ? (
            <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
              {address}
            </Text>
          ) : (
            <Text style={[styles.address, { color: colors.textSecondary, fontStyle: 'italic' }]}>
              Address not available
            </Text>
          )}
          
          <Text style={[styles.accuracy, { color: colors.textTertiary }]}>
            Accuracy: ~{location?.coords.accuracy?.toFixed(2)} meters
          </Text>
        </View>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleShareLocation}
          >
            <Ionicons name="share-social" size={20} color="white" />
            <Text style={styles.actionButtonText}>Share Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary, marginLeft: 8 }]}
            onPress={handleRefresh}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.actionButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  locationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  locationIcon: {
    marginRight: 16,
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  coordinates: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    marginBottom: 4,
  },
  accuracy: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default LocationView;
