 import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { Appointment, getAppointments, addAppointment as addAppointmentApi, updateAppointment as updateAppointmentApi, deleteAppointment as deleteAppointmentApi, toggleAppointmentReminder } from '../../api/appointment';
import { useAuth } from '../../hooks/useAuth';

// Custom Header Component
const CustomHeader = ({ title, onBack }: { title: string; onBack: () => void }) => {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={colors.primary} 
        />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.headerRight} />
    </View>
  );
};

const AppointmentScreen = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);
  
  const [newAppointment, setNewAppointment] = useState<Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { dateObj: Date, timeObj: Date }>({
    title: '',
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toISOString().split('T')[1].substring(0, 5),
    dateObj: new Date(),
    timeObj: new Date(),
    location: '',
    notes: '',
    reminder: true,
  });

  // Fetch appointments on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchAppointments();
    }
  }, [user?.id]);

  const fetchAppointments = async () => {
    try {
      if (!user?.id) return;
      
      setRefreshing(true);
      const { data, error } = await getAppointments(user.id);
      
      if (error) throw error;
      if (data) {
        setAppointments(data);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      Alert.alert('Error', 'Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    // Parse the time to ensure it's in HH:MM format
    const timeParts = appointment.time.split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const period = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format for display
    const displayHours = hours % 12 || 12;
    const displayTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    setNewAppointment({
      title: appointment.title,
      doctor: appointment.doctor || '',
      date: appointment.date,
      time: displayTime, // Use the formatted time
      dateObj: new Date(appointment.date),
      timeObj: new Date(`2000-01-01T${appointment.time}:00`),
      location: appointment.location || '',
      notes: appointment.notes || '',
      reminder: appointment.reminder,
    });
    setCurrentAppointmentId(appointment.id);
    setIsEditing(true);
    setModalVisible(true);
  };

  const saveAppointment = async () => {
    if (!newAppointment.title || !newAppointment.doctor || !user?.id) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Prepare the appointment data without dateObj and timeObj
      const appointmentData = {
        title: newAppointment.title,
        doctor: newAppointment.doctor,
        date: newAppointment.date,
        time: newAppointment.time,
        location: newAppointment.location,
        notes: newAppointment.notes,
        reminder: newAppointment.reminder,
        user_id: user.id,
      };

      if (isEditing && currentAppointmentId) {
        // Update existing appointment
        const { data, error } = await updateAppointmentApi(currentAppointmentId, appointmentData);
        
        if (error) throw error;
        if (data) {
          setAppointments(prev => 
            prev.map(apt => apt.id === currentAppointmentId ? data : apt)
              .sort(sortAppointments)
          );
        }
      } else {
        // Add new appointment
        const { data, error } = await addAppointmentApi(appointmentData);

        if (error) throw error;
        if (data) {
          setAppointments(prev => [...prev, data].sort(sortAppointments));
        }
      }
      
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save appointment:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} appointment. Please try again.`);
    }
  };

  const addAppointment = () => {
    resetForm();
    setIsEditing(false);
    setCurrentAppointmentId(null);
    setModalVisible(true);
  };

  const sortAppointments = (a: Appointment, b: Appointment) => {
    const dateA = new Date(`${a.date}T${a.time}`).getTime();
    const dateB = new Date(`${b.date}T${b.time}`).getTime();
    return dateA - dateB;
  };

  const resetForm = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    setNewAppointment({
      title: '',
      doctor: '',
      date: now.toISOString().split('T')[0],
      time: displayTime,
      dateObj: now,
      timeObj: now,
      location: '',
      notes: '',
      reminder: true,
    });
    Keyboard.dismiss();
  };

  const deleteAppointment = (id: string) => {
    Alert.alert(
      'Delete Appointment',
      'Are you sure you want to delete this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteAppointmentApi(id);
              if (error) throw error;
              setAppointments(prev => prev.filter(apt => apt.id !== id));
            } catch (error) {
              console.error('Failed to delete appointment:', error);
              Alert.alert('Error', 'Failed to delete appointment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleReminder = async (id: string, currentReminder: boolean) => {
    try {
      const { error } = await toggleAppointmentReminder(id, currentReminder);
      if (error) throw error;
      
      setAppointments(prev => 
        prev.map(apt =>
          apt.id === id ? { ...apt, reminder: !currentReminder } : apt
        )
      );
    } catch (error) {
      console.error('Failed to update reminder:', error);
      Alert.alert('Error', 'Failed to update reminder. Please try again.');
    }
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const appointmentDateTime = new Date(`${item.date}T${item.time}`);
    const today = new Date();
    const isPastAppointment = appointmentDateTime < today && 
      appointmentDateTime.toDateString() !== today.toDateString();
    
    return (
      <View 
        style={[
          styles.appointmentItem, 
          { 
            backgroundColor: colors.card,
            borderLeftWidth: 4,
            borderLeftColor: isPastAppointment ? '#6B7280' : colors.primary,
          }
        ]}
      >
        <View style={styles.appointmentHeader}>
          <View>
            <Text style={[styles.appointmentTitle, { color: colors.primary }]}>{item.title}</Text>
            <Text style={[styles.appointmentDoctor, { color: colors.text }]}>{item.doctor}</Text>
          </View>
          <View style={styles.appointmentTimeContainer}>
            <Ionicons name="time" size={16} color={colors.textSecondary} />
            <Text style={[styles.appointmentTime, { color: colors.textSecondary }]}>
              {new Date(`2000-01-01T${item.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          
          {item.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]}>{item.location}</Text>
            </View>
          )}
          
          {item.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={2}>
                {item.notes}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.appointmentActions}>
          <TouchableOpacity 
            onPress={() => toggleReminder(item.id, item.reminder)}
            style={[styles.actionButton, { backgroundColor: item.reminder ? colors.primary : '#E2E8F0' }]}
          >
            <Ionicons 
              name={item.reminder ? 'notifications' : 'notifications-off'} 
              size={20} 
              color={item.reminder ? 'white' : colors.text} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleEditAppointment(item)}
            style={[styles.actionButton, { backgroundColor: '#E0F2FE' }]}
          >
            <Ionicons name="pencil" size={20} color="#0EA5E9" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => deleteAppointment(item.id)}
            style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
          >
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader 
        title="My Appointments" 
        onBack={() => navigation.goBack()} 
      />
      <View style={styles.content}>
        {appointments.length > 0 ? (
          <FlatList
            data={appointments}
            renderItem={renderAppointmentItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar" size={64} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No appointments scheduled
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Tap the + button to add a new appointment
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
            keyboardVerticalOffset={20}
          >
            <ScrollView 
              style={[styles.modalContent, { backgroundColor: colors.card }]}
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {isEditing ? 'Edit Appointment' : 'Add Appointment'}
                </Text>
                <TouchableOpacity onPress={() => {
                  Keyboard.dismiss();
                  setModalVisible(false);
                }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Appointment Title (e.g., Doctor's Visit)"
              placeholderTextColor={colors.textSecondary}
              value={newAppointment.title}
              onChangeText={text => setNewAppointment({ ...newAppointment, title: text })}
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Doctor's Name"
              placeholderTextColor={colors.textSecondary}
              value={newAppointment.doctor}
              onChangeText={text => setNewAppointment({ ...newAppointment, doctor: text })}
            />

            <TouchableOpacity
              style={[styles.dateTimeButton, { backgroundColor: colors.background }]}
              onPress={() => {
                setShowDatePicker(true);
                setShowTimePicker(false);
              }}
            >
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                {newAppointment.date ? 
                  new Date(newAppointment.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  : 'Select Date'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateTimeButton, { backgroundColor: colors.background }]}
              onPress={() => {
                setShowTimePicker(true);
                setShowDatePicker(false);
              }}
            >
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                {newAppointment.time || 'Select Time'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={newAppointment.dateObj}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const formattedDate = selectedDate.toISOString().split('T')[0];
                    setNewAppointment({
                      ...newAppointment, 
                      date: formattedDate,
                      dateObj: selectedDate
                    });
                  }
                }}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={newAppointment.timeObj}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    const hours = selectedTime.getHours();
                    const minutes = selectedTime.getMinutes();
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                    
                    setNewAppointment({
                      ...newAppointment,
                      time: formattedTime,
                      timeObj: selectedTime
                    });
                  }
                }}
              />
            )}

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Location (optional)"
              placeholderTextColor={colors.textSecondary}
              value={newAppointment.location}
              onChangeText={text => setNewAppointment({ ...newAppointment, location: text })}
            />

            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { backgroundColor: colors.background, color: colors.text }
              ]}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textSecondary}
              value={newAppointment.notes}
              onChangeText={text => setNewAppointment({ ...newAppointment, notes: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.reminderContainer}>
              <Text style={[styles.reminderText, { color: colors.text }]}>
                Set Reminder
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setNewAppointment({
                    ...newAppointment,
                    reminder: !newAppointment.reminder,
                  })
                }
              >
                <View
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: newAppointment.reminder
                        ? colors.primary
                        : '#E2E8F0',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleCircle,
                      {
                        transform: [
                          { translateX: newAppointment.reminder ? 20 : 0 },
                        ],
                        backgroundColor: 'white',
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveAppointment}
              >
                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Update Appointment' : 'Save Appointment'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
    marginLeft: -24, // To center the title by offsetting the back button
  },
  headerRight: {
    width: 40, // Same as back button for balance
  },
  listContainer: {
    padding: 16,
  },
  appointmentItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  appointmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentDoctor: {
    fontSize: 16,
    color: '#4B5563',
  },
  appointmentTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appointmentTime: {
    marginLeft: 4,
    fontSize: 14,
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 12,
    maxHeight: '90%',
    width: '100%',
  },
  modalContentContainer: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  dateTimeButtonText: {
    marginLeft: 10,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  pickerButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pickerButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  pickerButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  reminderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  reminderText: {
    fontSize: 16,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppointmentScreen;
