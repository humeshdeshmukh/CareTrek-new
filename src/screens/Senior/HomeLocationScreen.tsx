import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, TextInput, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type RootStackParamList = {
  Map: undefined;
  HomeLocation: undefined;
};

type HomeLocationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeLocation'>;

type HomeLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
} | null;

type SearchResult = {
  place_id: string;
  licence: string;
  osm_type: string;
  osm_id: string;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    country_code: string;
  };
};

const HomeLocationScreen = () => {
  const navigation = useNavigation<HomeLocationScreenNavigationProp>();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [homeLocation, setHomeLocation] = useState<HomeLocation>(null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    fetchHomeLocation();
  }, []);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to set your home location');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setCurrentLocation(prev => ({
        ...prev,
        latitude,
        longitude,
      }));

      // Get address from coordinates
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        const formattedAddress = `${address.name || ''} ${address.street || ''} ${address.city || ''} ${address.region || ''} ${address.postalCode || ''}`.trim();
        setAddress(formattedAddress || 'Address not available');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location');
    } finally {
      setLoading(false);
    }
  };

  const fetchHomeLocation = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('home_locations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned"
        throw error;
      }

      if (data) {
        setHomeLocation(data);
        setAddress(data.address || '');
        setCurrentLocation(prev => ({
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude,
        }));
      }
    } catch (error) {
      console.error('Error fetching home location:', error);
      Alert.alert('Error', 'Failed to load home location');
    }
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);

    // Set new timeout for debounced search (500ms)
    const timeout = setTimeout(async () => {
      try {
        const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        
        if (!googleMapsApiKey) {
          console.warn('Google Maps API key not found');
          // Fallback to Nominatim
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10`;
          const response = await fetch(url);
          const data = await response.json();
          if (data) {
            setSearchResults(data);
          }
          return;
        }

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${googleMapsApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.predictions && data.predictions.length > 0) {
          // Convert Google Places format to our format
          const convertedResults = data.predictions.map((prediction: any) => ({
            place_id: prediction.place_id,
            display_name: prediction.description,
            lat: prediction.geometry?.location?.lat || 0,
            lon: prediction.geometry?.location?.lng || 0,
          }));
          setSearchResults(convertedResults);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Error searching location:', error);
      }
    }, 500);

    setSearchTimeout(timeout);
  };

  const selectLocation = async (location: any) => {
    try {
      const lat = parseFloat(location.lat);
      const lon = parseFloat(location.lon);
      
      setCurrentLocation(prev => ({
        ...prev,
        latitude: lat,
        longitude: lon,
      }));

      // Use the display name from search results if available
      if (location.display_name) {
        setAddress(location.display_name);
        setSearchResults([]);
        return;
      }

      // Get address from coordinates using reverse geocoding
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const response = await fetch(url);
      const data = await response.json();

      if (data) {
        const formattedAddress = `${data.address.road || ''} ${data.address.city || ''} ${data.address.state || ''} ${data.address.postcode || ''}`.trim();
        setAddress(formattedAddress || data.display_name || 'Address not available');
      }
      setSearchResults([]);
    } catch (error) {
      console.error('Error selecting location:', error);
      Alert.alert('Error', 'Failed to select location');
    }
  };

  const saveHomeLocation = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save a home location');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Error', 'Please select a location');
      return;
    }

    setSaving(true);
    try {
      const homeLocationData = {
        user_id: user.id,
        name: 'Home',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        address: address,
        updated_at: new Date().toISOString(),
      };

      let result;
      
      if (homeLocation?.id) {
        // Update existing home location
        result = await supabase
          .from('home_locations')
          .update(homeLocationData)
          .eq('id', homeLocation.id)
          .select();
      } else {
        // Insert new home location
        result = await supabase
          .from('home_locations')
          .insert([homeLocationData])
          .select();
      }

      if (result.error) throw result.error;

      const newId = homeLocation?.id || '';
      setHomeLocation({
        id: newId,
        ...homeLocationData,
      });
      
      setIsEditing(false);
      setSaving(false);
      
      // Navigate back immediately without delay
      navigation.goBack();
    } catch (error) {
      console.error('Error saving home location:', error);
      setSaving(false);
      Alert.alert('Error', 'Failed to save home location. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, isDark && styles.darkText]}>
          {isEditing ? 'Edit Home Location' : 'Set Home Location'}
        </Text>
        {homeLocation && !isEditing && (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Ionicons name="pencil" size={20} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1A2332' : '#FFFFFF', borderBottomColor: isDark ? '#2D3E52' : '#E5E7EB' }]}>
        <View style={[styles.searchBarWrapper, { backgroundColor: isDark ? '#2D3E52' : '#F3F4F6' }]}>
          <Ionicons name="search" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#E2E8F0' : '#1A202C' }]}
            placeholder="Search for a location"
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchLocation(text);
              setShowSearchResults(true);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowSearchResults(false);
            }}>
              <Ionicons name="close-circle" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearchResults && searchResults.length > 0 && (
        <ScrollView style={[styles.searchResultsContainer, { backgroundColor: isDark ? '#1A2332' : '#FFFFFF', borderBottomColor: isDark ? '#2D3E52' : '#E5E7EB' }]}>
          {searchResults.slice(0, 5).map((result, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.searchResultItem, { borderBottomColor: isDark ? '#2D3E52' : '#E5E7EB' }]}
              onPress={() => selectLocation(result)}
            >
              <Ionicons name="location" size={16} color={isDark ? '#63B3ED' : '#3182CE'} />
              <Text style={[styles.searchResultText, { color: isDark ? '#E2E8F0' : '#1A202C' }]} numberOfLines={1}>
                {result.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={currentLocation}
          onRegionChangeComplete={region => {
            setCurrentLocation(region);
          }}
        >
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Your Home"
            description={address}
          >
            <Ionicons name="home" size={32} color={isDark ? '#4dabf7' : '#1e88e5'} />
          </Marker>
        </MapView>
      </View>

      <View style={[styles.addressContainer, isDark && styles.darkAddressContainer]}>
        <Ionicons name="location" size={20} color={isDark ? '#fff' : '#666'} />
        <Text style={[styles.addressText, isDark && styles.darkText]} numberOfLines={2}>
          {address || 'Move the map to set your home location'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.secondaryButton, isDark && styles.darkSecondaryButton]}
          onPress={getCurrentLocation}
        >
          <Ionicons name="locate" size={18} color={isDark ? '#fff' : '#1e88e5'} />
          <Text style={[styles.secondaryButtonText, isDark && styles.darkText]}>Current</Text>
        </TouchableOpacity>

        {isEditing && homeLocation && (
          <TouchableOpacity
            style={[styles.secondaryButton, isDark && styles.darkSecondaryButton]}
            onPress={() => setIsEditing(false)}
          >
            <Ionicons name="close" size={18} color={isDark ? '#fff' : '#EF4444'} />
            <Text style={[styles.secondaryButtonText, { color: isDark ? '#fff' : '#EF4444' }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveButton, (saving || !address) && styles.disabledButton]}
          onPress={saveHomeLocation}
          disabled={saving || !address}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {homeLocation && !isEditing ? 'Update' : 'Save'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  darkHeader: {
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  editButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
  },
  darkText: {
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  darkAddressContainer: {
    backgroundColor: '#1e1e1e',
    borderTopColor: '#333',
  },
  addressText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  searchBarContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  darkSearchBarContainer: {
    backgroundColor: '#121212',
    borderBottomColor: '#333',
  },
  searchBar: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
  },
  darkSearchBar: {
    borderColor: '#666',
    color: '#fff',
  },
  searchResultsContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  darkSearchResultsContainer: {
    backgroundColor: '#121212',
    borderColor: '#333',
  },
  searchResultText: {
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  darkSearchResultText: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  darkButtonContainer: {
    backgroundColor: '#121212',
    borderTopColor: '#333',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e88e5',
    gap: 8,
  },
  darkSecondaryButton: {
    backgroundColor: '#1e1e1e',
    borderColor: '#4dabf7',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e88e5',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#1e88e5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#90caf9',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
});

export default HomeLocationScreen;
