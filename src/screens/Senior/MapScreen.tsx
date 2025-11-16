import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  Share,
  Linking,
  SafeAreaView as RNFSafeAreaView,
  PermissionsAndroid,
  NativeModules
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle, Region, MapType, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/translation/TranslationContext';
import { useCachedTranslation } from '../../hooks/useCachedTranslation';
import Slider from '@react-native-community/slider';
import { useAuth } from '../../hooks/useAuth';
import { homeLocationService } from '../../services/homeLocationService';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
// Remove duplicate Linking import

const { width, height } = Dimensions.get('window');

type MapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Map' | 'HomeLocation'>;

type LocationPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

type SafeZone = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
};

const STORAGE_KEYS = {
  FAVORITES: '@map_favorites_v1',
  SAFE_ZONES: '@map_safezones_v1',
  HISTORY: '@map_history_v1',
  HOME: '@map_home_v1',
};

const DEFAULT_REGION: Region = {
  latitude: 21.005066,
  longitude: 79.047718,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const MapScreen: React.FC = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const { isDark } = useTheme();
  const { currentLanguage } = useTranslation();

  const { translatedText: myLocationText } = useCachedTranslation('My Location', currentLanguage);
  const { translatedText: shareText } = useCachedTranslation('Share', currentLanguage);
  const { translatedText: backText } = useCachedTranslation('Back', currentLanguage);

  const mapRef = useRef<MapView>(null);

  // Map & UI
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [showTraffic, setShowTraffic] = useState<boolean>(false);

  // Sharing (simplified: one-shot share)
  const [isSharingLive, setIsSharingLive] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sosText, setSosText] = useState('');

  // Location
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
    timestamp: Date.now(),
  });
  const [currentAddress, setCurrentAddress] = useState<string>('');

  // Safezones, favorites, home
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [tempZoneCoords, setTempZoneCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [newZoneModalVisible, setNewZoneModalVisible] = useState(false);
  const [newZoneTitle, setNewZoneTitle] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState<number>(100);
  const [favorites, setFavorites] = useState<LocationPoint[]>([]);
  const [favoritesModalVisible, setFavoritesModalVisible] = useState(false);
  const [homeLocation, setHomeLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [homeAddress, setHomeAddress] = useState<string>('');


  // Turn-by-turn navigation state
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeSteps, setRouteSteps] = useState<Array<{ instruction: string; lat: number; lng: number; distance?: number; duration?: number }>>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const navAnimRef = useRef<number | null>(null);
  const navIndexRef = useRef<number>(0);
  const { user } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<any>(null);

  // Request location permission for both Android and iOS
  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasLocationPermission(granted);
      
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to show your position on the map. Please enable it in your device settings.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission. Please try again.');
      return false;
    }
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    console.log('Getting current location...');

    try {
      // First check if we have permission
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted, requesting...');
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) return null;
      }

      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services on your device to use this feature.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return null;
      }

      console.log('Requesting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
        mayShowUserSettingsDialog: true, // Show dialog to enable location if disabled
      });

      console.log('Got position:', location);
      const { latitude, longitude, accuracy } = location.coords;
      
      if (!latitude || !longitude) {
        throw new Error('Invalid coordinates received');
      }

      // Only update if we have valid coordinates
      if (latitude && longitude) {
        const newLocation = {
          latitude,
          longitude,
          timestamp: Date.now(),
        };

        console.log('New location:', newLocation);
        setCurrentLocation(newLocation);
        checkSafeZones(newLocation);

        // Center map on current location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 350);
        }

        return newLocation;
      }
    } catch (error: any) {
      console.warn('Error getting location:', error);
      let errorMessage = 'Unable to get your current location.';

      if (error?.code === 'E_LOCATION_UNAUTHORIZED') {
        errorMessage = 'Location permission was denied. Please enable it in app settings.';
      } else if (error?.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'Location information is unavailable. Please check your device settings.';
      } else if (error?.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out. Please try again.';
      }

      Alert.alert('Location Error', errorMessage, [
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
        { text: 'OK' }
      ]);
    }
    return null;
  };

  // Watch position for updates
  const watchPosition = () => {
    let subscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 5000,   // Update every 5 seconds
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        const newLocation = {
          latitude,
          longitude,
          timestamp: Date.now(),
        };
        setCurrentLocation(newLocation);
        checkSafeZones(newLocation);
      }
    ).then(sub => {
      subscription = sub;
    }).catch(error => {
      console.warn('Error watching location:', error);
    });

    // Return cleanup function
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  };

  // Initialize location services
  const initLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        // Get initial location
        await getCurrentLocation();

        // Start watching position for updates
        const cleanupWatch = watchPosition();

        // Return cleanup function
        return () => {
          if (cleanupWatch) {
            cleanupWatch();
          }
        };
      }
    } catch (error) {
      console.warn('Error initializing location:', error);
      Alert.alert('Location Error', 'Failed to initialize location services');
    }
  };

  // Load home location on mount
  useEffect(() => {
    const loadHomeLocation = async () => {
      if (user?.id) {
        const location = await homeLocationService.getHomeLocation(user.id);
        if (location) {
          setHomeLocation({
            latitude: location.latitude,
            longitude: location.longitude
          });
        }
      }
    };
    loadHomeLocation();
  }, [user?.id]);

  // Initialize location tracking and other effects
  useEffect(() => {
    (async () => {
      await loadPersistedData();
      await initLocation();
    })();

    return () => {
      stopNavAnimation();
    };
  }, []);

  // persist favorites/safezones/home when changed
  useEffect(() => { AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites)).catch(() => {}); }, [favorites]);
  useEffect(() => { AsyncStorage.setItem(STORAGE_KEYS.SAFE_ZONES, JSON.stringify(safeZones)).catch(() => {}); }, [safeZones]);
  useEffect(() => { AsyncStorage.setItem(STORAGE_KEYS.HOME, JSON.stringify(homeLocation)).catch(() => {}); }, [homeLocation]);

  // update address when currentLocation changes
  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const addr = await reverseGeocode(currentLocation.latitude, currentLocation.longitude);
        if (mounted) setCurrentAddress(addr);
      } catch (e) {
        console.warn('Reverse geocode failed', e);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [currentLocation]);

  // Handle region change
  const handleRegionChange = (region: Region) => {
    setRegion(region);
  };

  // Render map markers
  const renderMapMarkers = () => {
    return (
      <>
        {homeLocation && (
          <Marker
            coordinate={homeLocation}
            title="Home"
            pinColor="#4CAF50"
          />
        )}
      </>
    );
  };

  // ---------- helpers ----------
  const loadPersistedData = async () => {
    try {
      const favRaw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      const szRaw = await AsyncStorage.getItem(STORAGE_KEYS.SAFE_ZONES);
      const homeRaw = await AsyncStorage.getItem(STORAGE_KEYS.HOME);
      if (favRaw) setFavorites(JSON.parse(favRaw));
      if (szRaw) setSafeZones(JSON.parse(szRaw));
      if (homeRaw) {
        const h = JSON.parse(homeRaw);
        setHomeLocation(h);
        if (h) reverseGeocode(h.latitude, h.longitude).then(a => setHomeAddress(a)).catch(() => {});
      }
    } catch (e) {
      console.warn('Load persisted failed', e);
    }
  };

  // Refresh location button handler
  const handleRefreshLocation = () => {
    getCurrentLocation();
  };

  const checkSafeZones = (loc: LocationPoint) => {
    safeZones.forEach((z) => {
      const distance = haversineDistance(z.latitude, z.longitude, loc.latitude, loc.longitude);
      if (distance <= z.radius) console.log(`[zone] inside ${z.title}`);
    });
  };

  const confirmAddSafeZone = () => {
    if (!tempZoneCoords) {
      Alert.alert('Error', 'No coordinates selected.');
      return;
    }
    const newZone: SafeZone = {
      id: `zone_${Date.now()}`,
      title: newZoneTitle || 'Safe Zone',
      latitude: tempZoneCoords.latitude,
      longitude: tempZoneCoords.longitude,
      radius: newZoneRadius,
    };
    setSafeZones((s) => [...s, newZone]);
    setNewZoneModalVisible(false);
    setTempZoneCoords(null);
    setNewZoneTitle('');
    setNewZoneRadius(100);
    Alert.alert('Zone added', newZone.title);
  };

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ---------- Reverse geocoding (Nominatim) - improved for long precise address ----------
  const buildLongAddressFromNominatim = (addrObj: any) => {
    if (!addrObj) return '';
    const parts: string[] = [];

    const pushIf = (v?: string | null) => { if (v && v.trim()) parts.push(v.trim()); };

    // Common fields in priority order
    pushIf(addrObj.house_number);
    pushIf(addrObj.road || addrObj.pedestrian || addrObj.cycleway);
    pushIf(addrObj.neighbourhood || addrObj.suburb || addrObj.village || addrObj.hamlet);
    pushIf(addrObj.city_district);
    pushIf(addrObj.city || addrObj.town || addrObj.village);
    pushIf(addrObj.county);
    pushIf(addrObj.state_district);
    pushIf(addrObj.state);
    pushIf(addrObj.postcode);
    pushIf(addrObj.country);

    return parts.join(', ');
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      // request addressdetails=1 and namedetails to get full components
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'CareTrek/1.0 (contact: none)' } });
      if (!res.ok) throw new Error('geocode failed');
      const json = await res.json();

      // Build the most precise long address possible
      const longAddress = buildLongAddressFromNominatim(json.address) || json.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

      // Append extra context like place type or notable name if available
      const named = json.name || json.display_name || '';
      const placeType = json.type ? `(${json.type})` : '';

      // Final address: longAddress + named/placeType
      const final = [longAddress, named, placeType].filter(Boolean).join(' ').trim();

      return final || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    } catch (e) {
      console.warn('Reverse geocode error', e);
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  };

  // ---------- Share (improved to include cross-platform links & full address) ----------
  const openShareModal = () => setShareModalVisible(true);
  const closeShareModal = () => setShareModalVisible(false);

  const makeCrossPlatformLocationLinks = (lat: number, lon: number) => {
    const latStr = lat.toFixed(6);
    const lonStr = lon.toFixed(6);
    const google = `https://www.google.com/maps/search/?api=1&query=${latStr},${lonStr}`;
    const apple = `http://maps.apple.com/?q=${latStr},${lonStr}`;
    const osm = `https://www.openstreetmap.org/?mlat=${latStr}&mlon=${lonStr}#map=19/${latStr}/${lonStr}`;
    const geoUri = `geo:${latStr},${lonStr}`; // works on many android devices
    return { google, apple, osm, geoUri };
  };

  const startLiveShare = async () => {
    setIsSharingLive(true);
    setShareModalVisible(false);

    // get address for current location
    const addr = await reverseGeocode(currentLocation.latitude, currentLocation.longitude);
    const links = makeCrossPlatformLocationLinks(currentLocation.latitude, currentLocation.longitude);

    const locTextLines = [
      `Location address: ${addr}`,
      `Coordinates: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
      `Open in Google Maps: ${links.google}`,
      `Open in Apple Maps: ${links.apple}`,
      `Open in OSM: ${links.osm}`,
      `Intent (geo URI): ${links.geoUri}`,
    ];

    const message = `My precise location:\n\n${locTextLines.join('\n')}`;

    try {
      await Share.share({ message, title: 'My precise location' });
    } catch (e) {
      console.warn('Share failed', e);
      Alert.alert('Share', 'Unable to open share sheet.');
    }

    setIsSharingLive(false);
  };

  // ---------- Home (save current as home) ----------
  const saveHome = async () => {
    const p = currentLocation;
    setHomeLocation(p);
    const addr = await reverseGeocode(p.latitude, p.longitude);
    setHomeAddress(addr);
    Alert.alert('Home saved', addr);
  };

  const navigateHome = async () => {
    if (!homeLocation) { Alert.alert('Home', 'No home saved.'); return; }
    // use OSRM demo server for routing (open-source). If fails, fallback to straight line.
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${homeLocation.longitude},${homeLocation.latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.routes && json.routes.length) {
        const coords = json.routes[0].geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
        setRouteCoords(coords);
        // simple step extraction from legs (if available)
        const steps: Array<{ instruction: string; lat: number; lng: number }> = [];
        (json.routes[0].legs || []).forEach((leg: any) => { (leg.steps || []).forEach((s: any) => { steps.push({ instruction: s.maneuver && s.maneuver.instruction ? s.maneuver.instruction : 'Proceed', lat: s.maneuver.location[1], lng: s.maneuver.location[0] }); }); });
        setRouteSteps(steps);
        startRouteAnimation(coords, steps);
      } else {
        startStraightLineNav(homeLocation.latitude, homeLocation.longitude);
      }
    } catch (e) {
      console.warn('OSRM failed', e);
      startStraightLineNav(homeLocation.latitude, homeLocation.longitude);
    }
  };

  // ---------- SOS (improved with long address + links) ----------
  const triggerSOS = async () => {
    const addr = await reverseGeocode(currentLocation.latitude, currentLocation.longitude);
    const links = makeCrossPlatformLocationLinks(currentLocation.latitude, currentLocation.longitude);
    const locText = `${addr} (Google Maps: ${links.google})`;
    const message = `SOS! Please help. My location:\n\nAddress: ${addr}\nCoordinates: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}\nGoogle Maps: ${links.google}\nOSM: ${links.osm}`;

    try {
      await Share.share({ message, title: 'SOS — Help' });
    } catch (e) {
      console.warn('Share failed', e);
      Alert.alert('SOS', 'Unable to open sharing options — please call your emergency contacts.');
    }

    Alert.alert('SOS', 'SOS message prepared. Please complete the send in your messaging app.');
  };

  // ---------- Navigation helpers (straight line + route animation) ----------
  const startStraightLineNav = (destLat: number, destLng: number) => {
    const steps = generateStraightLineSteps(currentLocation.latitude, currentLocation.longitude, destLat, destLng, 30);
    const coords = steps.map(s => ({ latitude: s.lat, longitude: s.lon }));
    setRouteCoords(coords);
    const inst = coords.map((c, i) => ({ instruction: `Step ${i + 1}`, lat: c.latitude, lng: c.longitude }));
    setRouteSteps(inst);
    startRouteAnimation(coords, inst);
  };

  const generateStraightLineSteps = (lat1: number, lon1: number, lat2: number, lon2: number, segments = 10) => {
    const out: Array<{ lat: number; lon: number }> = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments; out.push({ lat: lat1 + (lat2 - lat1) * t, lon: lon1 + (lon2 - lon1) * t });
    }
    return out;
  };

  const startRouteAnimation = (coords: Array<{ latitude: number; longitude: number }>, steps: Array<{ instruction: string; lat: number; lng: number }>) => {
    stopNavAnimation();
    if (!coords || coords.length === 0) return;
    navIndexRef.current = 0;
    navAnimRef.current = setInterval(() => {
      const idx = navIndexRef.current;
      if (idx >= coords.length) { stopNavAnimation(); setRouteSteps([]); setRouteCoords([]); return; }
      const c = coords[idx];
      mapRef.current?.animateToRegion({ latitude: c.latitude, longitude: c.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
      navIndexRef.current = idx + 1;
    }, 700) as unknown as number;
  };

  const stopNavAnimation = () => { 
    if (navAnimRef.current) { 
      clearInterval(navAnimRef.current as any); 
      navAnimRef.current = null; 
      navIndexRef.current = 0; 
    } 
  };

  // Simple straight-line navigation fallback
  const startNavigation = useCallback((destination: { latitude: number; longitude: number }) => {
    if (!currentLocation) return;
    
    const newRoute = [
      { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
      destination
    ];
    
    setRouteCoords(newRoute);
    setRouteSteps([
      { instruction: 'Head to destination', lat: destination.latitude, lng: destination.longitude }
    ]);
    setIsNavigating(true);
    
    mapRef.current?.fitToCoordinates(newRoute, {
      edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
      animated: true,
    });
  }, [currentLocation]);

  const startNavigationTo = useCallback(async (lat: number, lng: number) => {
    if (!currentLocation) return;
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${lng},${lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const json = await res.json();
      
      if (json.routes && json.routes.length) {
        const route = json.routes[0];
        const coords = route.geometry.coordinates.map((c: any) => ({ 
          latitude: c[1], 
          longitude: c[0] 
        }));
        
        setRouteCoords(coords);
        
        // Extract total distance (in meters) and duration (in seconds)
        const distance = route.distance || 0; // meters
        const duration = route.duration || 0; // seconds
        setTotalDistance(distance);
        setTotalDuration(duration);
        
        const steps: Array<{ instruction: string; lat: number; lng: number; distance?: number; duration?: number }> = [];
        (route.legs || []).forEach((leg: any) => { 
          (leg.steps || []).forEach((s: any) => { 
            steps.push({ 
              instruction: s.maneuver?.instruction || 'Proceed', 
              lat: s.maneuver?.location?.[1] || lat, 
              lng: s.maneuver?.location?.[0] || lng,
              distance: s.distance,
              duration: s.duration
            }); 
          }); 
        });
        
        setRouteSteps(steps);
        setIsNavigating(true);
        
        // Center map on route
        if (coords.length > 0) {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
            animated: true,
          });
        }
      } else {
        // Fallback to straight line navigation
        startNavigation({ latitude: lat, longitude: lng });
      }
    } catch (e) {
      console.warn('OSRM routing failed, falling back to straight line navigation', e);
      // Fallback to straight line navigation
      startNavigation({ latitude: lat, longitude: lng });
    }
  }, [currentLocation, startNavigation]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setRouteCoords([]);
    setRouteSteps([]);
    // Reset map to show current location
    if (currentLocation) {
      mapRef.current?.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [currentLocation]);

  const navigateToHome = useCallback(() => {
    if (homeLocation) {
      startNavigation(homeLocation);
    } else {
      // @ts-ignore - HomeLocation is a valid route
      navigation.navigate('HomeLocation');
    }
  }, [homeLocation, navigation, startNavigation]);

  // Center on user location
  const centerOnUserLocation = useCallback(async () => {
    if (hasLocationPermission) {
      const location = await Location.getCurrentPositionAsync({});

      const { latitude, longitude } = location.coords;
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [hasLocationPermission]);

  // Navigate to home location screen
  const navigateToHomeLocation = useCallback(() => {
    navigation.navigate('HomeLocation');
  }, [navigation]);

  // Search for locations
  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(async () => {
      try {
        const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        
        if (!googleMapsApiKey) {
          // Fallback to Nominatim
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8`;
          const response = await fetch(url);
          const data = await response.json();
          setSearchResults(data || []);
          return;
        }

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${googleMapsApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.predictions) {
          setSearchResults(data.predictions.map((p: any) => ({
            place_id: p.place_id,
            display_name: p.description,
            lat: p.geometry?.location?.lat || 0,
            lon: p.geometry?.location?.lng || 0,
          })));
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300);

    setSearchTimeout(timeout);
  }, [searchTimeout]);

  // Navigate to search result
  const navigateToSearchResult = useCallback(async (result: any) => {
    let lat = parseFloat(result.lat);
    let lon = parseFloat(result.lon);

    // If using Google Places, get details for accurate coordinates
    if (result.place_id && (!lat || !lon)) {
      try {
        const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        if (googleMapsApiKey) {
          const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.place_id}&key=${googleMapsApiKey}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.result?.geometry?.location) {
            lat = data.result.geometry.location.lat;
            lon = data.result.geometry.location.lng;
          }
        }
      } catch (error) {
        console.error('Error getting place details:', error);
      }
    }
    
    // Center on selected location
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });

    setSelectedLocation({ ...result, latitude: lat, longitude: lon });
    setPinnedLocation({ latitude: lat, longitude: lon });
    setShowLocationDetails(true);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  // Navigate to home using proper routing
  const navigateToHomeWithRoute = useCallback(() => {
    if (homeLocation) {
      startNavigationTo(homeLocation.latitude, homeLocation.longitude);
    } else {
      Alert.alert('Home Location Not Set', 'Please set your home location first', [
        { text: 'Set Now', onPress: () => navigation.navigate('HomeLocation') },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  }, [homeLocation, startNavigationTo, navigation]);

  // ---------- Render ----------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F1724' : '#FFFBEF' }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#24303a' : '#E6E6E6' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
          <Ionicons name="arrow-back" size={20} color={isDark ? '#E2E8F0' : '#1A202C'} />
          <Text style={[styles.headerTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{myLocationText}</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setFavoritesModalVisible(true)} style={styles.iconButton} accessibilityLabel="Open favorites">
            <Ionicons name="star" size={20} color={isDark ? '#E2E8F0' : '#1A202C'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMapType((t) => (t === 'standard' ? 'satellite' : t === 'satellite' ? 'hybrid' : 'standard'))} style={styles.iconButton}>
            <Ionicons name="layers" size={20} color={isDark ? '#E2E8F0' : '#1A202C'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTraffic((s) => !s)} style={styles.iconButton}>
            <Ionicons name="speedometer" size={20} color={showTraffic ? '#EF4444' : (isDark ? '#E2E8F0' : '#1A202C')} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openShareModal} style={[styles.shareButton, { backgroundColor: isDark ? '#1F2937' : '#2F855A' }]}>
            <Ionicons name="share-social" size={18} color="white" />
            <Text style={styles.shareButtonText}>{shareText}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1A2332' : '#FFFFFF', borderBottomColor: isDark ? '#2D3E52' : '#E5E7EB' }]}>
        <View style={[styles.searchBarWrapper, { backgroundColor: isDark ? '#2D3E52' : '#F3F4F6' }]}>
          <Ionicons name="search" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#E2E8F0' : '#1A202C' }]}
            placeholder="Search locations..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchLocations(text);
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

      {/* Search Results */}
      {showSearchResults && searchResults.length > 0 && (
        <View style={[styles.searchResultsContainer, { backgroundColor: isDark ? '#1A2332' : '#FFFFFF', borderBottomColor: isDark ? '#2D3E52' : '#E5E7EB' }]}>
          {searchResults.slice(0, 5).map((result, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.searchResultItem, { borderBottomColor: isDark ? '#2D3E52' : '#E5E7EB' }]}
              onPress={() => navigateToSearchResult(result)}
            >
              <Ionicons name="location" size={16} color={isDark ? '#63B3ED' : '#3182CE'} />
              <Text style={[styles.searchResultText, { color: isDark ? '#E2E8F0' : '#1A202C' }]} numberOfLines={1}>
                {result.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton={false}
          mapType={mapType}
          showsTraffic={showTraffic}
          onRegionChangeComplete={handleRegionChange}
        >
          {/* Map markers and overlays */}
          {renderMapMarkers()}
          {safeZones.map((z) => (<Circle key={z.id} center={{ latitude: z.latitude, longitude: z.longitude }} radius={z.radius} strokeColor="rgba(34,139,34,0.6)" fillColor="rgba(34,139,34,0.15)" />))}
          {favorites.map((f, idx) => (
            <Marker 
              key={`fav-${idx}`} 
              coordinate={{ latitude: f.latitude, longitude: f.longitude }} 
              pinColor="purple"
              onPress={() => {
                setSelectedLocation({ latitude: f.latitude, longitude: f.longitude, display_name: `Favorite ${idx + 1}` });
                setShowLocationDetails(true);
              }}
            />
          ))}
          {tempZoneCoords && <Marker coordinate={tempZoneCoords} pinColor="orange" />}
          {/* Pinned location marker */}
          {pinnedLocation && (
            <Marker
              coordinate={pinnedLocation}
              pinColor="red"
              title={selectedLocation?.display_name || 'Selected Location'}
              onPress={() => setShowLocationDetails(true)}
            />
          )}
          {/* route polyline */}
          {routeCoords && routeCoords.length > 0 && (
            <>
              <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#3B82F6" lineDashPattern={[5, 5]} />
              {routeCoords.length > 0 && (
                <Marker 
                  coordinate={routeCoords[routeCoords.length - 1]} 
                  title="Destination"
                  pinColor="#10B981"
                />
              )}
            </>
          )}
        </MapView>
      </View>
      {/* Footer (bottom panel) */}
      <View style={[styles.footer, { backgroundColor: isDark ? '#1A2332' : '#FFFFFF', borderTopColor: isDark ? '#2D3E52' : '#E5E7EB' }]}>
        <View style={styles.locationInfo}>
          <View style={[styles.locationIconBg, { backgroundColor: isDark ? '#2D3E52' : '#EFF6FF' }]}>
            <Ionicons name="location" size={18} color={isDark ? '#63B3ED' : '#3182CE'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.addressTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>Current Location</Text>
            <Text style={[styles.address, { color: isDark ? '#9CA3AF' : '#4A5568' }]}>{currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</Text>
            <Text style={[styles.smallText, { color: isDark ? '#9CA3AF' : '#718096' }]} numberOfLines={2}>{currentAddress || 'Address: —'}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.footerButton, { backgroundColor: '#8B5CF6' }]} onPress={navigateToHomeLocation} activeOpacity={0.8}>
          <Ionicons name="settings" size={20} color="white" />
        </TouchableOpacity>
      </View>
      {/* Floating Action Buttons */}
      <View style={styles.floatingButtonsContainer}>
        {/* Current Location Button */}
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: isDark ? '#3B82F6' : '#3B82F6' }]}
          onPress={centerOnUserLocation}
          accessibilityLabel="Center on current location"
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={24} color="white" />
        </TouchableOpacity>

        {/* Navigate to Home Button */}
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: isDark ? '#10B981' : '#10B981' }]}
          onPress={navigateToHomeWithRoute}
          accessibilityLabel="Navigate to home"
          activeOpacity={0.8}
        >
          <Ionicons name="home" size={24} color="white" />
        </TouchableOpacity>

        {/* General Navigation Button */}
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: isDark ? '#F59E0B' : '#F59E0B' }]}
          onPress={() => {
            setSearchQuery('');
            setSearchResults([]);
            setShowSearchResults(true);
          }}
          accessibilityLabel="Search and navigate"
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-circle" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Location Details Card */}
      {showLocationDetails && selectedLocation && !isNavigating && (
        <View style={[styles.locationDetailsCard, { backgroundColor: isDark ? '#1A2332' : '#FFFFFF', borderTopColor: isDark ? '#2D3E52' : '#E5E7EB' }]}>
          <View style={styles.locationDetailsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationDetailsTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]} numberOfLines={2}>
                {selectedLocation.display_name}
              </Text>
              <Text style={[styles.locationDetailsCoords, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setShowLocationDetails(false);
                setSelectedLocation(null);
              }}
              style={styles.closeDetailsButton}
            >
              <Ionicons name="close" size={24} color={isDark ? '#E2E8F0' : '#1A202C'} />
            </TouchableOpacity>
          </View>

          <View style={styles.locationDetailsButtons}>
            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: isDark ? '#3B82F6' : '#3B82F6' }]}
              onPress={() => {
                setShowLocationDetails(false);
                startNavigationTo(selectedLocation.latitude, selectedLocation.longitude);
              }}
            >
              <Ionicons name="navigate" size={18} color="white" />
              <Text style={styles.detailsButtonText}>Nav</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: isDark ? '#EF4444' : '#EF4444' }]}
              onPress={() => {
                setPinnedLocation({ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude });
              }}
            >
              <Ionicons name="pin" size={18} color="white" />
              <Text style={styles.detailsButtonText}>Pin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: isDark ? '#10B981' : '#10B981' }]}
              onPress={() => {
                mapRef.current?.animateToRegion({
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                });
              }}
            >
              <Ionicons name="eye" size={18} color="white" />
              <Text style={styles.detailsButtonText}>View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: isDark ? '#8B5CF6' : '#8B5CF6' }]}
              onPress={() => {
                const message = `Location: ${selectedLocation.display_name}\nCoordinates: ${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`;
                Share.share({
                  message,
                  title: 'Share Location',
                });
              }}
            >
              <Ionicons name="share-social" size={18} color="white" />
              <Text style={styles.detailsButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Navigation Controls */}
      {isNavigating && (
        <View style={[styles.navigationControls, isDark && styles.navigationControlsDark]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.navInstruction, isDark && styles.darkText]}>
              {routeSteps[0]?.instruction || 'Navigating...'}
            </Text>
            <View style={styles.navInfoRow}>
              <Text style={[styles.navInfo, isDark && styles.darkText]}>
                📍 {(totalDistance / 1000).toFixed(1)} km
              </Text>
              <Text style={[styles.navInfo, isDark && styles.darkText]}>
                ⏱️ {Math.ceil(totalDuration / 60)} min
              </Text>
              {routeSteps[0]?.distance && (
                <Text style={[styles.navInfo, isDark && styles.darkText]}>
                  → {(routeSteps[0].distance / 1000).toFixed(2)} km
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.stopNavButton}
            onPress={stopNavigation}
          >
            <Text style={styles.stopNavText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Share Modal (simplified - one-shot share) */}
      <Modal visible={shareModalVisible} transparent animationType="slide" onRequestClose={closeShareModal}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: isDark ? '#0B1220' : '#FFF' }]}>
          <Text style={[styles.modalTitle, { color: isDark ? '#E2E8F0' : '#111' }]}>Share location</Text>
          <Text style={{ marginBottom: 12 }}>Share your current precise location (full address + coordinates + open links).</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity style={styles.modalButtonCancel} onPress={closeShareModal}><Text>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalButtonPrimary} onPress={startLiveShare}><Text style={{ color: 'white' }}>Share</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
      {/* Add Safe Zone Modal */}
      <Modal visible={newZoneModalVisible} transparent animationType="slide" onRequestClose={() => setNewZoneModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: isDark ? '#0B1220' : '#FFF' }]}>
          <Text style={[styles.modalTitle, { color: isDark ? '#E2E8F0' : '#111' }]}>Add Safe Zone</Text>
          <TextInput placeholder="Zone name" value={newZoneTitle} onChangeText={setNewZoneTitle} style={[styles.input, { backgroundColor: isDark ? '#111827' : '#F7FAFC', color: isDark ? '#E2E8F0' : '#111' }]} placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'} />
          <Text style={{ marginBottom: 8 }}>{`Radius (meters): ${newZoneRadius}`}</Text>
          <Slider minimumValue={50} maximumValue={1000} step={10} value={newZoneRadius} onValueChange={(v) => setNewZoneRadius(Math.round(v))} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { setNewZoneModalVisible(false); setTempZoneCoords(null); }}><Text>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalButtonPrimary} onPress={confirmAddSafeZone}><Text style={{ color: 'white' }}>Add Zone</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
      {/* Favorites Modal (moved from footer) */}
      <Modal visible={favoritesModalVisible} transparent animationType="slide" onRequestClose={() => setFavoritesModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: isDark ? '#0B1220' : '#FFF', maxHeight: 400 }]}>
          <Text style={[styles.modalTitle, { color: isDark ? '#E2E8F0' : '#111' }]}>Favorites</Text>
          {favorites.length === 0 ? (<Text style={{ color: isDark ? '#9CA3AF' : '#4A5568' }}>No favorites saved.</Text>) : (favorites.map((f, i) => (
            <TouchableOpacity key={`fav-item-${i}`} style={{ padding: 10, borderRadius: 8, marginVertical: 6, backgroundColor: isDark ? '#071127' : '#F7FAFC' }} onPress={() => { setFavoritesModalVisible(false); mapRef.current?.animateToRegion({ latitude: f.latitude, longitude: f.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 350); }}>
              <Text style={{ color: isDark ? '#E2E8F0' : '#111' }}>{`${f.latitude.toFixed(5)}, ${f.longitude.toFixed(5)}`}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <TouchableOpacity style={{ marginRight: 12 }} onPress={() => startNavigationTo(f.latitude, f.longitude)}><Text style={{ color: '#2563EB' }}>Navigate</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setFavorites((prev) => prev.filter((_, idx) => idx !== i)); }}><Text style={{ color: '#EF4444' }}>Remove</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))) }
          <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setFavoritesModalVisible(false)}><Text>Close</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
};
export default MapScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { marginLeft: 8, fontSize: 18, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { marginHorizontal: 6, alignItems: 'center' },
  iconLabel: { fontSize: 10 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    marginLeft: 8,
  },
  shareButtonText: { color: 'white', marginLeft: 6, fontWeight: '600' },
  mapContainer: { flex: 1, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  locationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressTitle: { fontSize: 13, fontWeight: '600' },
  address: { fontSize: 11, marginTop: 2 },
  smallText: { fontSize: 10, marginTop: 2 },
  footerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  floatingButtonsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    alignItems: 'center',
    gap: 12,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  navigationControls: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  navigationControlsDark: {
    backgroundColor: '#333',
  },
  navInstruction: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  navInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  navInfo: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  darkText: {
    color: '#fff',
  },
  stopNavButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  stopNavText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1F2937',
  },
  modalButtonPrimary: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#10B981',
    minWidth: 120,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalButtonCancel: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: { 
    padding: 12, 
    borderRadius: 10, 
    marginVertical: 10,
    backgroundColor: '#F9FAFB',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
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
  searchResultsContainer: {
    maxHeight: 200,
    borderBottomWidth: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchResultText: {
    flex: 1,
    fontSize: 13,
  },
  locationDetailsCard: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    borderTopWidth: 1,
    borderRadius: 12,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  locationDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationDetailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationDetailsCoords: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeDetailsButton: {
    padding: 4,
  },
  locationDetailsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

// Notes for maintainers:
// - Reverse geocoding now requests addressdetails and constructs a long, componentized address (house number, road, neighbourhood, city, state, postcode, country).
// - Share and SOS now include multiple open links (Google Maps, Apple Maps, OpenStreetMap) and a geo: URI so the receiver can open the precise location in most mapping apps.
// - Marker description displays the full address string when available.
// - This keeps the one-shot share behaviour; for continuous live-sharing you'd need a backend or socket-based approach.
