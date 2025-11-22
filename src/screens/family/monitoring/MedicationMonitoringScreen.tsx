import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import {
    getMedications,
    Medication,
    deleteMedication,
    toggleMedicationReminder,
    addMedication as addMedicationAPI,
    updateMedication as updateMedicationAPI,
} from '../../../api/medication';
import { useConnectedSenior } from '../../../hooks/useConnectedSenior';

const frequencies = [
    'Once daily',
    'Twice daily',
    'Three times a day',
    'Four times a day',
    'Every 4 hours',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'As needed',
];

const MedicationMonitoringScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const route = useRoute();

    const { senior: defaultSenior } = useConnectedSenior();
    const params = route.params as { seniorId?: string; seniorName?: string } | undefined;
    const seniorId = params?.seniorId || defaultSenior?.id || '';
    const seniorName = params?.seniorName || defaultSenior?.name || 'Senior';

    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date>(new Date());
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

    const [newMedication, setNewMedication] = useState<Omit<Medication, 'id' | 'created_at' | 'updated_at'>>({
        name: '',
        dosage: '',
        frequency: 'Once daily',
        instructions: '',
        time: new Date().toTimeString().substring(0, 5),
        reminder: true,
        start_date: new Date().toISOString().split('T')[0],
        user_id: seniorId,
    });

    const fetchMedications = useCallback(async () => {
        try {
            const { data, error } = await getMedications(seniorId);
            if (error) throw error;
            if (data) setMedications(data);
        } catch (error) {
            console.error('Error fetching medications:', error);
            Alert.alert('Error', 'Failed to load medications');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [seniorId]);

    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMedications();
    };

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setEditingMedicationId(null);
        setNewMedication({
            name: '',
            dosage: '',
            frequency: 'Once daily',
            instructions: '',
            time: new Date().toTimeString().substring(0, 5),
            reminder: true,
            start_date: new Date().toISOString().split('T')[0],
            user_id: seniorId,
        });
        setSelectedTime(new Date());
        setModalVisible(true);
    };

    const handleOpenEditModal = (med: Medication) => {
        setIsEditing(true);
        setEditingMedicationId(med.id);
        setNewMedication({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            instructions: med.instructions || '',
            time: med.time,
            reminder: med.reminder,
            start_date: med.start_date,
            user_id: seniorId,
        });
        const [hours, minutes] = med.time.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        setSelectedTime(date);
        setModalVisible(true);
    };

    const handleSaveMedication = async () => {
        if (!newMedication.name || !newMedication.dosage) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);

            if (isEditing && editingMedicationId) {
                const { data, error } = await updateMedicationAPI(editingMedicationId, {
                    ...newMedication,
                    user_id: seniorId,
                });

                if (error) throw error;

                if (data) {
                    setMedications(medications.map(med => (med.id === editingMedicationId ? { ...data } : med)));
                } else {
                    await fetchMedications();
                }
            } else {
                const { data, error } = await addMedicationAPI({
                    ...newMedication,
                    user_id: seniorId,
                });

                if (error) throw error;

                if (data) {
                    setMedications(prev => [...prev, data]);
                } else {
                    await fetchMedications();
                }
            }

            setModalVisible(false);
            Alert.alert('Success', `Medication ${isEditing ? 'updated' : 'added'} successfully`);
        } catch (error) {
            console.error('Error saving medication:', error);
            Alert.alert('Error', 'Failed to save medication. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Medication',
            'Are you sure you want to delete this medication?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await deleteMedication(id);
                        if (error) {
                            Alert.alert('Error', 'Failed to delete medication');
                        } else {
                            fetchMedications();
                        }
                    }
                }
            ]
        );
    };

    const handleToggleReminder = async (id: string, current: boolean) => {
        const { error } = await toggleMedicationReminder(id, current);
        if (error) {
            Alert.alert('Error', 'Failed to update reminder');
        } else {
            fetchMedications();
        }
    };

    const onTimeChange = (event: any, date?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedTime(date);
            const timeString = date.toTimeString().substring(0, 5);
            setNewMedication({ ...newMedication, time: timeString });
        }
    };

    const renderItem = ({ item }: { item: Medication }) => (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                        <Ionicons name="medkit" size={24} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={[styles.medName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.medDosage, { color: colors.textSecondary }]}>{item.dosage}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => handleToggleReminder(item.id, item.reminder)}
                    style={[styles.reminderBtn, { backgroundColor: item.reminder ? colors.primary : colors.border }]}
                >
                    <Ionicons name={item.reminder ? "notifications" : "notifications-off"} size={16} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        {item.time} • {item.frequency}
                    </Text>
                </View>
                {item.instructions && (
                    <View style={styles.detailRow}>
                        <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            {item.instructions}
                        </Text>
                    </View>
                )}
            </View>

            <View style={[styles.actions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenEditModal(item)}
                >
                    <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(item.id)}
                >
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
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
                    {seniorName}'s Medications
                </Text>
                <TouchableOpacity
                    onPress={handleOpenAddModal}
                    style={styles.addButton}
                >
                    <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={medications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="medkit-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No medications found
                        </Text>
                    </View>
                }
            />

            {/* Add/Edit Modal */}
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
                                {isEditing ? 'Edit Medication' : 'Add Medication'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Medication Name *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={newMedication.name}
                                    onChangeText={(text) => setNewMedication({ ...newMedication, name: text })}
                                    placeholder="e.g., Aspirin"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Dosage *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={newMedication.dosage}
                                    onChangeText={(text) => setNewMedication({ ...newMedication, dosage: text })}
                                    placeholder="e.g., 100mg"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Frequency</Text>
                                <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <Picker
                                        selectedValue={newMedication.frequency}
                                        onValueChange={(value) => setNewMedication({ ...newMedication, frequency: value })}
                                        style={{ color: colors.text }}
                                    >
                                        {frequencies.map((freq) => (
                                            <Picker.Item key={freq} label={freq} value={freq} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Time</Text>
                                <TouchableOpacity
                                    style={[styles.input, styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border }]}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text style={{ color: colors.text }}>{newMedication.time}</Text>
                                    <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {showTimePicker && (
                                <DateTimePicker
                                    value={selectedTime}
                                    mode="time"
                                    is24Hour={false}
                                    display="default"
                                    onChange={onTimeChange}
                                />
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Instructions (Optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={newMedication.instructions}
                                    onChangeText={(text) => setNewMedication({ ...newMedication, instructions: text })}
                                    placeholder="e.g., Take with food"
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.switchRow}>
                                <Text style={[styles.label, { color: colors.text }]}>Enable Reminder</Text>
                                <TouchableOpacity
                                    onPress={() => setNewMedication({ ...newMedication, reminder: !newMedication.reminder })}
                                    style={[styles.switch, { backgroundColor: newMedication.reminder ? colors.primary : colors.border }]}
                                >
                                    <View style={[styles.switchThumb, { transform: [{ translateX: newMedication.reminder ? 20 : 0 }] }]} />
                                </TouchableOpacity>
                            </View>
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
                                onPress={handleSaveMedication}
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
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    addButton: {
        padding: 8,
        marginRight: -8,
    },
    list: {
        padding: 16,
    },
    card: {
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    medName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    medDosage: {
        fontSize: 14,
    },
    reminderBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    detailText: {
        fontSize: 14,
        marginLeft: 8,
    },
    actions: {
        flexDirection: 'row',
        borderTopWidth: 1,
    },
    actionBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontWeight: '600',
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 48,
    },
    emptyText: {
        marginTop: 16,
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
        maxHeight: '90%',
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
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    timeInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pickerContainer: {
        borderWidth: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    switch: {
        width: 50,
        height: 30,
        borderRadius: 15,
        padding: 2,
        justifyContent: 'center',
    },
    switchThumb: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'white',
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

export default MedicationMonitoringScreen;
