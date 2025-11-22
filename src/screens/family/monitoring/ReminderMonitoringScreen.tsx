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
    Switch,
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
import { reminderService, Reminder } from '../../../services/reminderService';
import { supabase } from '../../../lib/supabase';

// Helper: convert time to "HH:MM AM/PM" format
const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const hoursStr = hours < 10 ? '0' + hours : hours;
    return `${hoursStr}:${minutesStr} ${ampm}`;
};

// Helper: parse "HH:MM AM/PM" to Date
const parseTimeString = (timeStr: string): Date => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};

import { useConnectedSenior } from '../../../hooks/useConnectedSenior';

const ReminderMonitoringScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const route = useRoute();

    const { senior, loading: seniorLoading, noSeniors } = useConnectedSenior();

    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date>(new Date());
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

    const [newReminder, setNewReminder] = useState<Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at'>>({
        title: '',
        time: formatTime(new Date()),
        type: 'medication',
        enabled: true,
    });

    const fetchReminders = useCallback(async () => {
        if (!senior) return;
        try {
            const { data, error } = await supabase
                .from('reminders')
                .select('*')
                .eq('user_id', senior.id)
                .order('time', { ascending: true });

            if (error) throw error;
            setReminders(data || []);
        } catch (error) {
            console.error('Error fetching reminders:', error);
            Alert.alert('Error', 'Failed to load reminders');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [senior]);

    useEffect(() => {
        if (senior) {
            fetchReminders();
        }
    }, [senior, fetchReminders]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchReminders();
    };

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setEditingReminderId(null);
        const now = new Date();
        setNewReminder({
            title: '',
            time: formatTime(now),
            type: 'medication',
            enabled: true,
        });
        setSelectedTime(now);
        setModalVisible(true);
    };

    const handleOpenEditModal = (reminder: Reminder) => {
        setIsEditing(true);
        setEditingReminderId(reminder.id);
        setNewReminder({
            title: reminder.title,
            time: reminder.time,
            type: reminder.type,
            enabled: reminder.enabled,
        });
        setSelectedTime(parseTimeString(reminder.time));
        setModalVisible(true);
    };

    const handleSaveReminder = async () => {
        if (!newReminder.title.trim()) {
            Alert.alert('Error', 'Please enter a reminder title');
            return;
        }

        try {
            setLoading(true);

            if (isEditing && editingReminderId) {
                // Update reminder
                const { data, error } = await supabase
                    .from('reminders')
                    .update({
                        title: newReminder.title,
                        time: newReminder.time,
                        type: newReminder.type,
                        enabled: newReminder.enabled,
                    })
                    .eq('id', editingReminderId)
                    .eq('user_id', senior?.id)
                    .select()
                    .single();

                if (error) throw error;
                if (data) {
                    setReminders(reminders.map(r => (r.id === editingReminderId ? data : r)));
                }
            } else {
                // Add new reminder
                if (!senior) return;
                const { data, error } = await supabase
                    .from('reminders')
                    .insert([{
                        user_id: senior.id,
                        title: newReminder.title,
                        time: newReminder.time,
                        type: newReminder.type,
                        enabled: newReminder.enabled,
                    }])
                    .select()
                    .single();

                if (error) throw error;
                if (data) {
                    setReminders(prev => [...prev, data]);
                }
            }

            setModalVisible(false);
            Alert.alert('Success', `Reminder ${isEditing ? 'updated' : 'added'} successfully`);
            fetchReminders();
        } catch (error) {
            console.error('Error saving reminder:', error);
            Alert.alert('Error', 'Failed to save reminder. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Reminder',
            'Are you sure you want to delete this reminder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await reminderService.deleteReminder(id);
                            fetchReminders();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete reminder');
                        }
                    }
                }
            ]
        );
    };

    const handleToggle = async (id: string, current: boolean) => {
        try {
            await reminderService.toggleReminder(id, !current);
            fetchReminders();
        } catch (error) {
            Alert.alert('Error', 'Failed to update reminder');
        }
    };

    const onTimeChange = (event: any, date?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedTime(date);
            const timeString = formatTime(date);
            setNewReminder({ ...newReminder, time: timeString });
        }
    };

    const renderItem = ({ item }: { item: Reminder }) => (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <View style={[
                        styles.iconContainer,
                        { backgroundColor: item.type === 'medication' ? `${colors.primary}20` : '#10B98120' }
                    ]}>
                        <Ionicons
                            name={item.type === 'medication' ? "medkit" : "walk"}
                            size={24}
                            color={item.type === 'medication' ? colors.primary : '#10B981'}
                        />
                    </View>
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.time, { color: colors.textSecondary }]}>{item.time}</Text>
                    </View>
                </View>
                <Switch
                    value={item.enabled}
                    onValueChange={() => handleToggle(item.id, item.enabled)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                />
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

    if (seniorLoading || (loading && !refreshing)) {
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
                    {senior?.name}'s Reminders
                </Text>
                <TouchableOpacity
                    onPress={handleOpenAddModal}
                    style={styles.addButton}
                >
                    <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={reminders}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No reminders found
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
                                {isEditing ? 'Edit Reminder' : 'Add Reminder'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Reminder Title *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={newReminder.title}
                                    onChangeText={(text) => setNewReminder({ ...newReminder, title: text })}
                                    placeholder="e.g., Take morning medication"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Type</Text>
                                <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <Picker
                                        selectedValue={newReminder.type}
                                        onValueChange={(value) => setNewReminder({ ...newReminder, type: value as 'medication' | 'activity' })}
                                        style={{ color: colors.text }}
                                    >
                                        <Picker.Item label="Medication" value="medication" />
                                        <Picker.Item label="Activity" value="activity" />
                                    </Picker>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Time</Text>
                                <TouchableOpacity
                                    style={[styles.input, styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border }]}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text style={{ color: colors.text }}>{newReminder.time}</Text>
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

                            <View style={styles.switchRow}>
                                <Text style={[styles.label, { color: colors.text }]}>Enable Reminder</Text>
                                <TouchableOpacity
                                    onPress={() => setNewReminder({ ...newReminder, enabled: !newReminder.enabled })}
                                    style={[styles.switch, { backgroundColor: newReminder.enabled ? colors.primary : colors.border }]}
                                >
                                    <View style={[styles.switchThumb, { transform: [{ translateX: newReminder.enabled ? 20 : 0 }] }]} />
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
                                onPress={handleSaveReminder}
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
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    time: {
        fontSize: 14,
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

export default ReminderMonitoringScreen;
