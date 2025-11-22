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
import {
    getAppointments,
    Appointment,
    deleteAppointment,
    toggleAppointmentReminder,
    addAppointment as addAppointmentAPI,
    updateAppointment as updateAppointmentAPI,
} from '../../../api/appointment';
import { useConnectedSenior } from '../../../hooks/useConnectedSenior';

const AppointmentMonitoringScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const route = useRoute();

    const { senior: defaultSenior } = useConnectedSenior();
    const params = route.params as { seniorId?: string; seniorName?: string } | undefined;
    const seniorId = params?.seniorId || defaultSenior?.id || '';
    const seniorName = params?.seniorName || defaultSenior?.name || 'Senior';

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [newAppointment, setNewAppointment] = useState<
        Omit<Appointment, 'id' | 'created_at' | 'updated_at'> & { dateObj: Date; timeObj: Date }
    >({
        title: '',
        doctor: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toISOString().split('T')[1].substring(0, 5),
        dateObj: new Date(),
        timeObj: new Date(),
        location: '',
        notes: '',
        reminder: true,
        user_id: seniorId,
    });

    const fetchAppointments = useCallback(async () => {
        try {
            const { data, error } = await getAppointments(seniorId);
            if (error) throw error;
            if (data) setAppointments(data);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            Alert.alert('Error', 'Failed to load appointments');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [seniorId]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAppointments();
    };

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setEditingAppointmentId(null);
        const now = new Date();
        setNewAppointment({
            title: '',
            doctor: '',
            date: now.toISOString().split('T')[0],
            time: now.toISOString().split('T')[1].substring(0, 5),
            dateObj: now,
            timeObj: now,
            location: '',
            notes: '',
            reminder: true,
            user_id: seniorId,
        });
        setModalVisible(true);
    };

    const handleOpenEditModal = (appointment: Appointment) => {
        setIsEditing(true);
        setEditingAppointmentId(appointment.id);
        setNewAppointment({
            title: appointment.title,
            doctor: appointment.doctor,
            date: appointment.date,
            time: appointment.time,
            dateObj: new Date(appointment.date),
            timeObj: new Date(`2000-01-01T${appointment.time}:00`),
            location: appointment.location || '',
            notes: appointment.notes || '',
            reminder: appointment.reminder,
            user_id: seniorId,
        });
        setModalVisible(true);
    };

    const handleSaveAppointment = async () => {
        if (!newAppointment.title || !newAppointment.doctor) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);

            const appointmentData = {
                title: newAppointment.title,
                doctor: newAppointment.doctor,
                date: newAppointment.date,
                time: newAppointment.time,
                location: newAppointment.location,
                notes: newAppointment.notes,
                reminder: newAppointment.reminder,
                user_id: seniorId,
            };

            if (isEditing && editingAppointmentId) {
                const { data, error } = await updateAppointmentAPI(editingAppointmentId, appointmentData);

                if (error) throw error;
                if (data) {
                    setAppointments(appointments.map(apt => (apt.id === editingAppointmentId ? data : apt)));
                } else {
                    await fetchAppointments();
                }
            } else {
                const { data, error } = await addAppointmentAPI(appointmentData);

                if (error) throw error;
                if (data) {
                    setAppointments(prev => [...prev, data]);
                } else {
                    await fetchAppointments();
                }
            }

            setModalVisible(false);
            Alert.alert('Success', `Appointment ${isEditing ? 'updated' : 'added'} successfully`);
        } catch (error) {
            console.error('Error saving appointment:', error);
            Alert.alert('Error', 'Failed to save appointment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Appointment',
            'Are you sure you want to delete this appointment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await deleteAppointment(id);
                        if (error) {
                            Alert.alert('Error', 'Failed to delete appointment');
                        } else {
                            fetchAppointments();
                        }
                    }
                }
            ]
        );
    };

    const handleToggleReminder = async (id: string, current: boolean) => {
        const { error } = await toggleAppointmentReminder(id, current);
        if (error) {
            Alert.alert('Error', 'Failed to update reminder');
        } else {
            fetchAppointments();
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setNewAppointment({
                ...newAppointment,
                dateObj: selectedDate,
                date: selectedDate.toISOString().split('T')[0],
            });
        }
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            const hours = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
            setNewAppointment({
                ...newAppointment,
                timeObj: selectedTime,
                time: `${hours}:${minutes}`,
            });
        }
    };

    const renderItem = ({ item }: { item: Appointment }) => {
        const appointmentDate = new Date(item.date);
        const isPast = appointmentDate < new Date() && appointmentDate.toDateString() !== new Date().toDateString();

        return (
            <View style={[styles.card, { backgroundColor: colors.card, opacity: isPast ? 0.7 : 1 }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.dateBox, { backgroundColor: isPast ? colors.border : `${colors.primary}20` }]}>
                            <Text style={[styles.dateDay, { color: isPast ? colors.textSecondary : colors.primary }]}>
                                {appointmentDate.getDate()}
                            </Text>
                            <Text style={[styles.dateMonth, { color: isPast ? colors.textSecondary : colors.primary }]}>
                                {appointmentDate.toLocaleDateString('en-US', { month: 'short' })}
                            </Text>
                        </View>
                        <View style={styles.titleContainer}>
                            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                            <Text style={[styles.doctor, { color: colors.textSecondary }]}>{item.doctor}</Text>
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
                            {item.time}
                        </Text>
                    </View>
                    {item.location && (
                        <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                                {item.location}
                            </Text>
                        </View>
                    )}
                    {item.notes && (
                        <View style={styles.detailRow}>
                            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={2}>
                                {item.notes}
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
    };

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
                    {seniorName}'s Appointments
                </Text>
                <TouchableOpacity
                    onPress={handleOpenAddModal}
                    style={styles.addButton}
                >
                    <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={appointments}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No appointments found
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
                                {isEditing ? 'Edit Appointment' : 'Add Appointment'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={newAppointment.title}
                                    onChangeText={(text) => setNewAppointment({ ...newAppointment, title: text })}
                                    placeholder="e.g., Regular Checkup"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Doctor *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={newAppointment.doctor}
                                    onChangeText={(text) => setNewAppointment({ ...newAppointment, doctor: text })}
                                    placeholder="e.g., Dr. Smith"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Date</Text>
                                <TouchableOpacity
                                    style={[styles.input, styles.dateInput, { backgroundColor: colors.background, borderColor: colors.border }]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={{ color: colors.text }}>
                                        {new Date(newAppointment.date).toLocaleDateString()}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={newAppointment.dateObj}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                />
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Time</Text>
                                <TouchableOpacity
                                    style={[styles.input, styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border }]}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text style={{ color: colors.text }}>{newAppointment.time}</Text>
                                    <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {showTimePicker && (
                                <DateTimePicker
                                    value={newAppointment.timeObj}
                                    mode="time"
                                    is24Hour={false}
                                    display="default"
                                    onChange={onTimeChange}
                                />
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Location (Optional)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={newAppointment.location || ''}
                                    onChangeText={(text) => setNewAppointment({ ...newAppointment, location: text })}
                                    placeholder="e.g., Main Hospital, Room 305"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Notes (Optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={newAppointment.notes || ''}
                                    onChangeText={(text) => setNewAppointment({ ...newAppointment, notes: text })}
                                    placeholder="Any additional notes"
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.switchRow}>
                                <Text style={[styles.label, { color: colors.text }]}>Enable Reminder</Text>
                                <TouchableOpacity
                                    onPress={() => setNewAppointment({ ...newAppointment, reminder: !newAppointment.reminder })}
                                    style={[styles.switch, { backgroundColor: newAppointment.reminder ? colors.primary : colors.border }]}
                                >
                                    <View style={[styles.switchThumb, { transform: [{ translateX: newAppointment.reminder ? 20 : 0 }] }]} />
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
                                onPress={handleSaveAppointment}
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
        alignItems: 'flex-start',
        padding: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        flex: 1,
    },
    dateBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    dateDay: {
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 22,
    },
    dateMonth: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    doctor: {
        fontSize: 14,
    },
    reminderBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
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
        flex: 1,
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
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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

export default AppointmentMonitoringScreen;
