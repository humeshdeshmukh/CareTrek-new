import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '../../../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { homeLocationService } from '../../../services/homeLocationService';
import * as Location from 'expo-location';
import { supabase } from '../../../lib/supabase';

const LocationMonitoringScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as { seniorId?: string; seniorName?: string } | undefined;

    const [seniorId, setSeniorId] = useState<string | undefined>(params?.seniorId);
    const [seniorName, setSeniorName] = useState<string | undefined>(params?.seniorName);
    const [loading, setLoading] = useState(true);
    const [homeLocation, setHomeLocation] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [noSeniors, setNoSeniors] = useState(false);
    const [editingLocation, setEditingLocation] = useState({
        address: '',
        latitude: 0,
        longitude: 0,
    });

    // Fetch senior if not provided
    useEffect(() => {
        const fetchSenior = async () => {
            if (seniorId) return;

            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                const { data: relationships } = await supabase
                    .from('family_relationships')
                    .select('senior_user_id')
                    .eq('family_member_id', user.id);

                if (relationships && relationships.length > 0) {
                    const firstSeniorId = relationships[0].senior_user_id;
                    const { data: profiles } = await supabase
                        .from('user_profiles')
                        .select('full_name')
                        .eq('id', firstSeniorId)
                        .single();

                    setSeniorId(firstSeniorId);
                    setSeniorName(profiles?.full_name || 'Senior');
                } else {
                    setNoSeniors(true);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching senior:', error);
                setLoading(false);
            }
        };

        fetchSenior();
    }, [seniorId]);

    useEffect(() => {
        if (seniorId) {
            fetchLocation();
        }
    }, [seniorId]);

    const fetchLocation = async () => {
        if (!seniorId) return;

        try {
            const location = await homeLocationService.getHomeLocation(seniorId);
            setHomeLocation(location);
        } catch (error) {
            console.error('Error fetching home location:', error);
        } finally {
            setLoading(false);
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
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to get current location');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const address = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (address.length > 0) {
                const addr = address[0];
                const fullAddress = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''} ${addr.postalCode || ''}`.trim();
                setEditingLocation({
                    address: fullAddress,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
            }
        } catch (error) {
            console.error('Error getting current location:', error);
            Alert.alert('Error', 'Failed to get current location');
        }
    };

    const handleSaveLocation = async () => {
        if (!seniorId) return;

        if (!editingLocation.address || editingLocation.latitude === 0 || editingLocation.longitude === 0) {
            Alert.alert('Error', 'Please provide a valid address and location');
            return;
        }

        try {
            setLoading(true);
            await homeLocationService.saveHomeLocation(
                seniorId,
                editingLocation.latitude,
                editingLocation.longitude,
                editingLocation.address
            );
            setModalVisible(false);
            await fetchLocation();
            Alert.alert('Success', 'Home location updated successfully');
        } catch (error) {
            console.error('Error saving home location:', error);
            Alert.alert('Error', 'Failed to save home location');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLocation = () => {
        if (!seniorId) return;

        Alert.alert(
            'Delete Home Location',
            'Are you sure you want to delete this home location?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await homeLocationService.deleteHomeLocation(seniorId);
                            setHomeLocation(null);
                            Alert.alert('Success', 'Home location deleted');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete home location');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
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

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {seniorName}'s Location
                </Text>
                <TouchableOpacity onPress={handleOpenEditModal} style={styles.editButton}>
                    <Ionicons name={homeLocation ? "pencil" : "add"} size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {homeLocation ? (
                    <View style={styles.mapContainer}>
                        <MapView
                            provider={PROVIDER_DEFAULT}
                            style={styles.map}
                            initialRegion={{
                                latitude: homeLocation.latitude,
                                longitude: homeLocation.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: homeLocation.latitude,
                                    longitude: homeLocation.longitude,
                                }}
                                title="Home"
                                description={homeLocation.address}
                                pinColor="green"
                            />
                        </MapView>
                        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                            <View style={styles.infoRow}>
                                <Ionicons name="home" size={24} color={colors.primary} />
                                <View style={styles.infoText}>
                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Home Location</Text>
                                    <Text style={[styles.infoValue, { color: colors.text }]}>{homeLocation.address}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.deleteButton, { backgroundColor: '#EF444420' }]}
                                onPress={handleDeleteLocation}
                            >
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                <Text style={[styles.deleteButtonText, { color: '#EF4444' }]}>Delete Location</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="location-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No home location set for this senior
                        </Text>
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.primary }]}
                            onPress={handleOpenEditModal}
                        >
                            <Text style={styles.addButtonText}>Add Home Location</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Add/Edit Location Modal */}
            <Modal
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
            </Modal>
        </SafeAreaView>
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
        padding: 16,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    editButton: {
        padding: 8,
        marginRight: -8,
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
    infoCard: {
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoText: {
        marginLeft: 12,
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
    },
    deleteButtonText: {
        marginLeft: 8,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyText: {
        marginTop: 16,
        marginBottom: 24,
        fontSize: 16,
        textAlign: 'center',
    },
    addButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    addButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
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
