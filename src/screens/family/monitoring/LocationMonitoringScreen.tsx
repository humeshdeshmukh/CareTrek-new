import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    Linking,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import { useTheme } from '../../../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { homeLocationService } from '../../../services/homeLocationService';
import * as Location from 'expo-location';
import { useConnectedSenior } from '../../../hooks/useConnectedSenior';
import { seniorLocationService } from '../../../services/seniorLocationService';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Get API key from environment
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

const LocationMonitoringScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const route = useRoute();

    // Use the standardized hook
    const { senior, loading: seniorLoading, noSeniors } = useConnectedSenior();

    const [loading, setLoading] = useState(true);
    const [homeLocation, setHomeLocation] = useState<any>(null);
    const [liveLocation, setLiveLocation] = useState<any>(null);
    const [searchedLocation, setSearchedLocation] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
    const [distance, setDistance] = useState<string | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingLocation, setEditingLocation] = useState({
        address: '',
        latitude: 0,
        longitude: 0,
    });

    // Navigation State
    const [isNavigating, setIsNavigating] = useState(false);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [navigationInfo, setNavigationInfo] = useState<{ distance: string, duration: string } | null>(null);

    // User's Location State (Always tracked now)
    const [myLocation, setMyLocation] = useState<any>(null);
    const [hasLocationPermission, setHasLocationPermission] = useState(false);
    const [initialUserLocationSet, setInitialUserLocationSet] = useState(false);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);

    const mapRef = useRef<MapView>(null);
    const autocompleteRef = useRef<any>(null);

    // Initial Data & Senior Updates
    useEffect(() => {
        if (senior) {
            fetchData();

            // Subscribe to live updates
            const unsubscribe = seniorLocationService.subscribeToLocationUpdates(senior.id, (newLocation) => {
                console.log('Received live location update:', newLocation);
                setLiveLocation(newLocation);
                if (!searchedLocation && !isNavigating) {
                    calculateDistance(newLocation);
                }

                // Auto-follow if tracking is enabled (and not navigating)
                if (isTracking && !isNavigating && mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude: newLocation.latitude,
                        longitude: newLocation.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }, 1000);
                }
            });

            return () => {
                unsubscribe();
            };
        }
    }, [senior, isTracking, searchedLocation, isNavigating]);

    // User Location Tracking (Always On) & Initial Center
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    setHasLocationPermission(true);

                    // Get initial location
                    const loc = await Location.getCurrentPositionAsync({});
                    const userLoc = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude
                    };
                    setMyLocation(userLoc);

                    // Center map on user initially if not already set
                    if (!initialUserLocationSet && mapRef.current) {
                        mapRef.current.animateToRegion({
                            latitude: userLoc.latitude,
                            longitude: userLoc.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }, 1000);
                        setInitialUserLocationSet(true);
                    }

                    // Watch for updates
                    locationSubscription.current = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.High,
                            distanceInterval: 10,
                        },
                        (location) => {
                            setMyLocation({
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude
                            });
                        }
                    );
                }
            } catch (error) {
                console.warn('Error requesting location permission:', error);
            }
        })();

        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []); // Run once on mount

    const fetchData = async () => {
        if (!senior) return;

        try {
            setLoading(true);
            const [homeLoc, latestLoc] = await Promise.all([
                homeLocationService.getHomeLocation(senior.id),
                seniorLocationService.getLatestLocation(senior.id)
            ]);

            setHomeLocation(homeLoc);
            setLiveLocation(latestLoc);
            if (latestLoc) calculateDistance(latestLoc);

            // Note: We don't center here anymore to respect the "Default to My Location" rule
            // unless My Location is not available yet, in which case we might center on senior later.
            // But the useEffect above handles the "My Location" centering priority.

        } catch (error) {
            console.error('Error fetching location data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateDistance = async (targetLoc: any) => {
        if (!myLocation) return;
        try {
            const dist = getDistanceFromLatLonInKm(
                myLocation.latitude,
                myLocation.longitude,
                targetLoc.latitude,
                targetLoc.longitude
            );
            setDistance(dist.toFixed(2));
        } catch (e) {
            console.log('Error calculating distance', e);
        }
    };

    function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        var R = 6371;
        var dLat = deg2rad(lat2 - lat1);
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return d;
    }

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180)
    }

    // Polyline Decoder
    const decodePolyline = (t: string) => {
        let points = [];
        let index = 0, len = t.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = t.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = t.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push({
                latitude: (lat / 1e5),
                longitude: (lng / 1e5)
            });
        }
        return points;
    };

    const fetchDirections = async (startLoc: any, destLoc: any) => {
        if (!GOOGLE_API_KEY) {
            Alert.alert('Configuration Error', 'Google Maps API Key is missing. Please check your .env file.');
            return;
        }

        try {
            const origin = `${startLoc.latitude},${startLoc.longitude}`;
            const destination = `${destLoc.latitude},${destLoc.longitude}`;
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_API_KEY}&mode=driving`;

            console.log('Fetching directions...');
            const response = await fetch(url);
            const result = await response.json();

            if (result.status === 'OK' && result.routes.length) {
                const route = result.routes[0];
                const points = decodePolyline(route.overview_polyline.points);
                setRouteCoordinates(points);

                if (route.legs.length) {
                    const leg = route.legs[0];
                    setNavigationInfo({
                        distance: leg.distance.text,
                        duration: leg.duration.text
                    });
                }

                // Fit map to route
                if (mapRef.current) {
                    mapRef.current.fitToCoordinates(points, {
                        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                        animated: true,
                    });
                }
            } else {
                console.error('Directions API Error:', result);
                let errorMessage = 'Could not find a route.';
                if (result.status === 'REQUEST_DENIED') {
                    errorMessage = 'API Key rejected. Ensure "Directions API" is enabled and the key is not restricted to Android/iOS apps.';
                } else if (result.status === 'ZERO_RESULTS') {
                    errorMessage = 'No route found between these locations.';
                } else if (result.error_message) {
                    errorMessage = result.error_message;
                }
                Alert.alert('Navigation Error', errorMessage);
                setIsNavigating(false);
            }
        } catch (error) {
            console.error('Error fetching directions:', error);
            Alert.alert('Network Error', 'Failed to fetch directions. Please check your internet connection.');
            setIsNavigating(false);
        }
    };

    const startNavigation = async () => {
        const target = searchedLocation || liveLocation || homeLocation;
        if (!target) {
            Alert.alert('No Location', 'No location available to navigate to.');
            return;
        }

        if (!myLocation) {
            Alert.alert('Location Error', 'Your location is not available yet. Please wait a moment.');
            return;
        }

        try {
            setIsNavigating(true);
            setIsTracking(false); // Disable senior tracking mode

            // Fetch initial route
            await fetchDirections(myLocation, target);

        } catch (error) {
            console.error('Error starting navigation:', error);
            setIsNavigating(false);
            Alert.alert('Error', 'Failed to start navigation.');
        }
    };

    const stopNavigation = () => {
        setIsNavigating(false);
        setRouteCoordinates([]);
        setNavigationInfo(null);

        // Reset map view
        if (mapRef.current && (liveLocation || homeLocation)) {
            const target = searchedLocation || liveLocation || homeLocation;
            mapRef.current.animateToRegion({
                latitude: target.latitude,
                longitude: target.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    const handleCenterOnUser = () => {
        if (myLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: myLocation.latitude,
                longitude: myLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        } else {
            Alert.alert('Location Unavailable', 'Your location is not yet available.');
        }
    };

    const handleOpenEditModal = () => {
        if (homeLocation) {
            setEditingLocation({
                address: homeLocation.address || '',
                latitude: homeLocation.latitude,
                longitude: homeLocation.longitude,
            });
        } else {
            setEditingLocation({
                address: '',
                latitude: 0,
                longitude: 0,
            });
        }
        setModalVisible(true);
    };

    const handleGetCurrentLocation = async () => {
        if (myLocation) {
            const address = await Location.reverseGeocodeAsync({
                latitude: myLocation.latitude,
                longitude: myLocation.longitude,
            });

            if (address.length > 0) {
                const addr = address[0];
                const fullAddress = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''} ${addr.postalCode || ''}`.trim();
                setEditingLocation({
                    address: fullAddress,
                    latitude: myLocation.latitude,
                    longitude: myLocation.longitude,
                });
            }
        } else {
            Alert.alert('Error', 'Current location not available');
        }
    };

    const handleSaveLocation = async () => {
        if (!senior) return;

        if (!editingLocation.address || editingLocation.latitude === 0 || editingLocation.longitude === 0) {
            Alert.alert('Error', 'Please provide a valid address and location');
            return;
        }

        try {
            setLoading(true);
            await homeLocationService.saveHomeLocation(
                senior.id,
                editingLocation.latitude,
                editingLocation.longitude,
                editingLocation.address
            );
            setModalVisible(false);
            const updatedHome = await homeLocationService.getHomeLocation(senior.id);
            setHomeLocation(updatedHome);
            Alert.alert('Success', 'Home location updated successfully');
        } catch (error) {
            console.error('Error saving home location:', error);
            Alert.alert('Error', 'Failed to save home location');
        } finally {
            setLoading(false);
        }
    };

    const toggleMapType = () => {
        const types: Array<'standard' | 'satellite' | 'hybrid'> = ['standard', 'satellite', 'hybrid'];
        const currentIndex = types.indexOf(mapType);
        const nextIndex = (currentIndex + 1) % types.length;
        setMapType(types[nextIndex]);
    };

    const handleTrackSenior = async () => {
        if (!senior) return;

        // If navigating, stop navigation first
        if (isNavigating) {
            stopNavigation();
        }

        try {
            setIsTracking(true);
            setSearchedLocation(null); // Clear searched location to resume tracking senior
            const latest = await seniorLocationService.getLatestLocation(senior.id);
            if (latest) {
                setLiveLocation(latest);
                calculateDistance(latest);
                if (mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude: latest.latitude,
                        longitude: latest.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }, 1000);
                }
            } else {
                setIsTracking(false);
                Alert.alert("Location Unavailable", "Could not get the latest location for the senior. They may not have shared their location yet.");
            }
        } catch (error) {
            console.error('Error tracking senior:', error);
            setIsTracking(false);
            Alert.alert('Error', 'Failed to track senior location');
        }
    };

    const handleFallbackSearch = async (query: string) => {
        try {
            const results = await Location.geocodeAsync(query);
            if (results && results.length > 0) {
                const { latitude, longitude } = results[0];
                const newLocation = {
                    latitude,
                    longitude,
                    address: query,
                    name: query
                };
                setSearchedLocation(newLocation);
                setIsTracking(false);
                if (isNavigating) stopNavigation(); // Stop nav if searching new place
                calculateDistance(newLocation);
                if (mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude,
                        longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }, 1000);
                }
            } else {
                Alert.alert('Location Not Found', 'Could not find the specified location.');
            }
        } catch (error) {
            console.error('Fallback search error:', error);
            Alert.alert('Search Error', 'Failed to search for location');
        }
    };

    if (seniorLoading || (loading && !homeLocation && !liveLocation)) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (noSeniors) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>No seniors connected</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isLive = liveLocation && (new Date().getTime() - new Date(liveLocation.timestamp).getTime() < 5 * 60 * 1000);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {isNavigating ? 'Navigating...' : `${senior?.name}'s Location`}
                    </Text>
                    {!isNavigating && isLive && (
                        <View style={styles.liveIndicator}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    )}
                </View>
                {!isNavigating && (
                    <TouchableOpacity onPress={handleOpenEditModal} style={styles.editButton}>
                        <Ionicons name={homeLocation ? "pencil" : "add"} size={24} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Navigation Overlay Info */}
            {isNavigating && navigationInfo && (
                <View style={[styles.navInfoContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.navInfoItem}>
                        <Ionicons name="time" size={20} color={colors.primary} />
                        <Text style={[styles.navInfoText, { color: colors.text }]}>{navigationInfo.duration}</Text>
                    </View>
                    <View style={styles.navInfoDivider} />
                    <View style={styles.navInfoItem}>
                        <Ionicons name="resize" size={20} color={colors.primary} />
                        <Text style={[styles.navInfoText, { color: colors.text }]}>{navigationInfo.distance}</Text>
                    </View>
                </View>
            )}

            {/* Search Bar (Hidden during navigation) */}
            {!isNavigating && (
                <View style={styles.searchWrapper}>
                    <View style={styles.searchContainer}>
                        {GOOGLE_API_KEY ? (
                            <GooglePlacesAutocomplete
                                ref={autocompleteRef}
                                placeholder='Search location...'
                                minLength={2}
                                listViewDisplayed='auto'
                                fetchDetails={true}
                                onPress={(data, details = null) => {
                                    if (details) {
                                        const { lat, lng } = details.geometry.location;
                                        const newLocation = {
                                            latitude: lat,
                                            longitude: lng,
                                            address: data.description,
                                            name: data.structured_formatting?.main_text || data.description
                                        };
                                        setSearchedLocation(newLocation);
                                        setIsTracking(false);
                                        calculateDistance(newLocation);
                                        if (mapRef.current) {
                                            mapRef.current.animateToRegion({
                                                latitude: lat,
                                                longitude: lng,
                                                latitudeDelta: 0.01,
                                                longitudeDelta: 0.01,
                                            }, 1000);
                                        }
                                    }
                                }}
                                query={{
                                    key: GOOGLE_API_KEY,
                                    language: 'en',
                                }}
                                styles={{
                                    container: { flex: 0 },
                                    textInputContainer: {
                                        backgroundColor: colors.card,
                                        borderRadius: 24,
                                        paddingHorizontal: 16,
                                        paddingVertical: 4,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 12,
                                        elevation: 8,
                                        borderTopWidth: 0,
                                        borderBottomWidth: 0,
                                    },
                                    textInput: {
                                        height: 48,
                                        color: colors.text,
                                        fontSize: 16,
                                        backgroundColor: 'transparent',
                                    },
                                    listView: {
                                        backgroundColor: colors.card,
                                        borderRadius: 16,
                                        marginTop: 12,
                                        elevation: 10,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 6 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 12,
                                        paddingVertical: 8,
                                    },
                                    row: {
                                        backgroundColor: 'transparent',
                                        padding: 16,
                                        minHeight: 56,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    },
                                    separator: {
                                        height: 1,
                                        backgroundColor: colors.border,
                                        marginLeft: 16,
                                        marginRight: 16,
                                    },
                                    description: {
                                        color: colors.text,
                                        fontSize: 15,
                                        fontWeight: '500',
                                    },
                                    poweredContainer: { display: 'none' },
                                }}
                                enablePoweredByContainer={false}
                                debounce={300}
                                renderRow={(data) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: isDark ? '#333' : '#f0f0f0',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 12
                                        }}>
                                            <Ionicons name="location" size={18} color={colors.primary} />
                                        </View>
                                        <Text style={{ color: colors.text, fontSize: 15, flex: 1, flexWrap: 'wrap' }}>
                                            {data.description}
                                        </Text>
                                    </View>
                                )}
                            />
                        ) : (
                            <View style={[styles.fallbackSearchContainer, { backgroundColor: colors.card }]}>
                                <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginLeft: 12 }} />
                                <TextInput
                                    style={[styles.fallbackSearchInput, { color: colors.text }]}
                                    placeholder="Search location..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    onSubmitEditing={() => handleFallbackSearch(searchQuery)}
                                    returnKeyType="search"
                                />
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Map */}
            <View style={styles.content}>
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_DEFAULT}
                        style={styles.map}
                        mapType={mapType}
                        initialRegion={{
                            latitude: liveLocation?.latitude || homeLocation?.latitude || 37.78825,
                            longitude: liveLocation?.longitude || homeLocation?.longitude || -122.4324,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        onPanDrag={() => {
                            if (!isNavigating) setIsTracking(false);
                        }}
                        showsUserLocation={true}
                        followsUserLocation={isNavigating}
                    >
                        {/* Route Polyline */}
                        {isNavigating && routeCoordinates.length > 0 && (
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeWidth={4}
                                strokeColor={colors.primary}
                            />
                        )}

                        {/* Destination Marker (Searched or Senior) */}
                        {searchedLocation && (
                            <Marker
                                coordinate={{
                                    latitude: searchedLocation.latitude,
                                    longitude: searchedLocation.longitude,
                                }}
                                title={searchedLocation.name}
                                description={searchedLocation.address}
                                pinColor="blue"
                            />
                        )}

                        {homeLocation && !searchedLocation && (
                            <Marker
                                coordinate={{
                                    latitude: homeLocation.latitude,
                                    longitude: homeLocation.longitude,
                                }}
                                title="Home"
                                description={homeLocation.address}
                            >
                                <View style={styles.markerContainer}>
                                    <Ionicons name="home" size={28} color="#10B981" />
                                </View>
                            </Marker>
                        )}

                        {liveLocation && (
                            <Marker
                                coordinate={{
                                    latitude: liveLocation.latitude,
                                    longitude: liveLocation.longitude,
                                }}
                                title={senior?.name}
                                description={`Last updated: ${new Date(liveLocation.timestamp).toLocaleTimeString()}`}
                                zIndex={2}
                            >
                                <View style={styles.markerContainer}>
                                    <View style={[styles.liveMarker, { backgroundColor: colors.primary }]}>
                                        <Ionicons name="person" size={24} color="white" />
                                    </View>
                                    <View style={styles.markerTimeStamp}>
                                        <Text style={[styles.markerTimeText, { color: colors.text }]}>
                                            {new Date(liveLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                            </Marker>
                        )}
                    </MapView>

                    {/* My Location Button */}
                    <TouchableOpacity
                        style={[styles.myLocationButton, { backgroundColor: colors.card }]}
                        onPress={handleCenterOnUser}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="locate" size={24} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Distance Indicator (Hidden during navigation) */}
                    {distance && !isNavigating && (
                        <View style={[styles.distanceCard, { backgroundColor: colors.card }]}>
                            <Ionicons name="navigate-circle" size={22} color={colors.primary} />
                            <Text style={[styles.distanceText, { color: colors.text }]}>
                                {distance} km away
                            </Text>
                        </View>
                    )}

                    {/* Footer with ALL action buttons */}
                    <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                        {!isNavigating ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.footerButton, { backgroundColor: isTracking ? colors.primary : colors.background }]}
                                    onPress={handleTrackSenior}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="locate" size={20} color={isTracking ? 'white' : colors.primary} />
                                    <Text style={[styles.footerButtonText, { color: isTracking ? 'white' : colors.primary }]}>Track</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.footerButton, { backgroundColor: colors.background }]}
                                    onPress={toggleMapType}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={mapType === 'standard' ? "map-outline" : mapType === 'satellite' ? "earth" : "layers-outline"}
                                        size={20}
                                        color={colors.primary}
                                    />
                                    <Text style={[styles.footerButtonText, { color: colors.primary }]}>
                                        {mapType === 'standard' ? 'Map' : mapType === 'satellite' ? 'Satellite' : 'Hybrid'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.footerButton, { backgroundColor: colors.primary }]}
                                    onPress={startNavigation}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="navigate" size={20} color="white" />
                                    <Text style={[styles.footerButtonText, { color: 'white' }]}>Navigate</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.stopNavButton, { backgroundColor: '#EF4444' }]}
                                onPress={stopNavigation}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close-circle" size={24} color="white" />
                                <Text style={styles.stopNavButtonText}>Exit Navigation</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View >

            {/* Add/Edit Location Modal */}
            < Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalContainer}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {homeLocation ? 'Edit Home Location' : 'Add Home Location'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Address *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={editingLocation.address}
                                    onChangeText={(text) => setEditingLocation({ ...editingLocation, address: text })}
                                    placeholder="e.g., 123 Main St, City, State 12345"
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Latitude *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={editingLocation.latitude.toString()}
                                    onChangeText={(text) => setEditingLocation({ ...editingLocation, latitude: parseFloat(text) || 0 })}
                                    placeholder="e.g., 37.7749"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Longitude *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={editingLocation.longitude.toString()}
                                    onChangeText={(text) => setEditingLocation({ ...editingLocation, longitude: parseFloat(text) || 0 })}
                                    placeholder="e.g., -122.4194"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.getCurrentButton, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
                                onPress={handleGetCurrentLocation}
                            >
                                <Ionicons name="locate" size={20} color={colors.primary} />
                                <Text style={[styles.getCurrentButtonText, { color: colors.primary }]}>
                                    Use Current Location
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.border }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleSaveLocation}
                            >
                                <Text style={[styles.modalButtonText, { color: 'white' }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal >
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 4,
    },
    liveText: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '600',
    },
    editButton: {
        padding: 8,
        marginRight: -8,
    },
    searchWrapper: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    searchContainer: {
        zIndex: 100,
    },
    fallbackSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        height: 48,
    },
    fallbackSearchInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        paddingHorizontal: 16,
    },
    content: {
        flex: 1,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        width: Dimensions.get('window').width,
        height: '100%',
    },
    markerContainer: {
        alignItems: 'center',
    },
    liveMarker: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    markerTimeStamp: {
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    markerTimeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    distanceCard: {
        position: 'absolute',
        top: 16,
        left: 16,
        padding: 10,
        paddingHorizontal: 14,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },
    distanceText: {
        marginLeft: 8,
        fontWeight: '600',
        fontSize: 14,
    },
    myLocationButton: {
        position: 'absolute',
        right: 16,
        bottom: 100, // Above footer
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    navInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    navInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    navInfoDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#E2E8F0',
    },
    navInfoText: {
        marginLeft: 8,
        fontWeight: '600',
        fontSize: 16,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        borderTopWidth: 1,
        gap: 8,
    },
    footerButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    footerButtonText: {
        fontWeight: '600',
        fontSize: 11,
        marginTop: 4,
    },
    stopNavButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    stopNavButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalBody: {
        padding: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    getCurrentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 8,
    },
    getCurrentButtonText: {
        marginLeft: 8,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
});

export default LocationMonitoringScreen;
