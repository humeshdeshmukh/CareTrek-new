import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  BackHandler,
  findNodeHandle,
  UIManager,
  Animated,
  SafeAreaView,
} from 'react-native';
import { useTheme, ThemeContextValue } from '../../contexts/theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../hooks/useAuth';
import {
  Medication,
  getMedications,
  addMedication as addMedicationAPI,
  updateMedication as updateMedicationAPI,
  deleteMedication as deleteMedicationAPI,
  toggleMedicationReminder as toggleMedicationReminderAPI,
} from '../../api/medication';

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

const MedicationScreen = () => {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const { user } = useAuth();
  const navigation = useNavigation();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  const timeInputRef = useRef<TouchableOpacity>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const instructionsRef = useRef<TextInput | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const [newMedication, setNewMedication] = useState<Omit<Medication, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    instructions: '',
    time: new Date().toTimeString().substring(0, 5),
    reminder: true,
    start_date: new Date().toISOString().split('T')[0],
  });

  // fetchMedications unchanged
  const fetchMedications = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await getMedications();
      if (error) throw error;
      if (data) setMedications(data);
    } catch (error) {
      console.error('Error fetching medications:', error);
      Alert.alert('Error', 'Failed to load medications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  // keyboard listeners to manage keyboard state and height
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e: any) => {
      setKeyboardOpen(true);
      setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : 250);
      Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // BackHandler: if keyboard open, dismiss keyboard instead of closing modal/navigation
  useEffect(() => {
    const onBackPress = () => {
      if (keyboardOpen) {
        Keyboard.dismiss();
        return true; // handled
      }
      if (modalVisible) {
        // close modal on back press
        setModalVisible(false);
        return true;
      }
      return false; // let system handle
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [keyboardOpen, modalVisible]);

  const handleSaveMedication = async () => {
    if (!newMedication.name || !newMedication.dosage) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated. Please sign in again.');
      return;
    }

    try {
      console.log('Saving medication with data:', {
        ...newMedication,
        user_id: user.id,
      });

      setIsLoading(true);

      if (isEditing && editingMedicationId) {
        console.log('Updating existing medication:', editingMedicationId);
        const { data, error } = await updateMedicationAPI(editingMedicationId, {
          ...newMedication,
          user_id: user.id,
        });
        
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        
        if (data) {
          console.log('Medication updated successfully:', data);
          setMedications(medications.map(med => (med.id === editingMedicationId ? { ...data } : med)));
        } else {
          console.warn('No data returned from update, but no error occurred');
          // Refresh the list to ensure we have the latest data
          await fetchMedications();
        }
      } else {
        console.log('Adding new medication');
        const { data, error } = await addMedicationAPI({
          ...newMedication,
          user_id: user.id,
        });
        
        if (error) {
          console.error('Add error:', error);
          throw error;
        }
        
        if (data) {
          console.log('Medication added successfully:', data);
          setMedications(prev => [...prev, data]);
        } else {
          console.warn('No data returned from add, but no error occurred');
          // Refresh the list to ensure we have the latest data
          await fetchMedications();
        }
      }

      setModalVisible(false);
      resetForm();
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error in handleSaveMedication:', error);
      Alert.alert(
        'Error', 
        `Failed to ${isEditing ? 'update' : 'add'} medication. ${error instanceof Error ? error.message : 'Please try again.'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewMedication({
      name: '',
      dosage: '',
      frequency: 'Once daily',
      instructions: '',
      time: new Date().toTimeString().substring(0, 5),
      reminder: true,
      start_date: new Date().toISOString().split('T')[0],
    });
    setIsEditing(false);
    setEditingMedicationId(null);
  };

  const deleteMedication = async (id: string) => {
    try {
      const { error } = await deleteMedicationAPI(id);
      if (error) throw error;
      setMedications(medications.filter(med => med.id !== id));
    } catch (error) {
      console.error('Error deleting medication:', error);
      Alert.alert('Error', 'Failed to delete medication. Please try again.');
    }
  };

  const toggleReminder = async (id: string, currentReminder: boolean = true) => {
    try {
      const { error } = await toggleMedicationReminderAPI(id, currentReminder);
      if (error) throw error;
      setMedications(medications.map(med => (med.id === id ? { ...med, reminder: !currentReminder } : med)));
    } catch (error) {
      console.error('Error toggling reminder:', error);
      Alert.alert('Error', 'Failed to update reminder. Please try again.');
    }
  };

  const formatTimeDisplay = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleEditMedication = (medication: Medication) => {
    setNewMedication({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      instructions: medication.instructions || '',
      time: medication.time,
      reminder: medication.reminder,
      start_date: medication.start_date,
    });
    setEditingMedicationId(medication.id);
    setIsEditing(true);
    setModalVisible(true);

    // Slight delay to allow modal open, then focus instructions if needed
    setTimeout(() => {
      // no-op
    }, 200);
  };

  // When instructions input focuses, measure and scroll to make it visible
  const onInstructionsFocus = async () => {
    // small delay to let keyboard open and layout adjust
    setTimeout(async () => {
      try {
        const inputHandle = findNodeHandle(instructionsRef.current);
        const scrollHandle = findNodeHandle(scrollRef.current);
        if (!inputHandle || !scrollHandle) return;

        // measure the position of the instructions input relative to the scroll view
        UIManager.measureLayout(
          inputHandle,
          scrollHandle,
          () => {
            /* error */
          },
          (left: number, top: number, width: number, height: number) => {
            // scroll so the input is slightly above keyboard
            const extraOffset = 20;
            const y = Math.max(0, top - extraOffset);
            scrollRef.current?.scrollTo({ y, animated: true });
          }
        );
      } catch (e) {
        // fallback: scroll to end
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    }, 250);
  };

  // close keyboard helper (used by the accessory button)
  const closeKeyboard = () => Keyboard.dismiss();

  if (isLoading) {
    const loadingStyles = getStyles(colors);
    return (
      <View style={[loadingStyles.container, loadingStyles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const styles = getStyles(colors);

  const renderMedicationItem = ({ item }: { item: Medication }) => (
    <View style={[styles.medicationItem, { backgroundColor: colors.card }]}>
      <View style={styles.medicationHeader}>
        <View style={{ flex: 1, padding: 12 }}>
          <View style={styles.medicationRow}>
            <Ionicons name="medkit-outline" size={20} color={colors.primary} style={styles.medicationIcon} />
            <View>
              <Text style={[styles.medicationName, { color: colors.primary }]}>{item.name}</Text>
              <Text style={[styles.medicationDosage, { color: colors.text }]}>{item.dosage}</Text>
            </View>
          </View>

          <View style={[styles.medicationRow, { marginTop: 8 }]}>
            <View style={styles.medicationInfoItem}>
              <Ionicons name="time-outline" size={16} color={colors.primary} style={styles.medicationIcon} />
              <Text style={[styles.medicationInfoText, { color: colors.text }]}>{formatTimeDisplay(item.time)}</Text>
            </View>

            <View style={styles.medicationInfoItem}>
              <Ionicons name="repeat-outline" size={16} color={colors.primary} style={styles.medicationIcon} />
              <Text style={[styles.medicationInfoText, { color: colors.text }]}>{item.frequency}</Text>
            </View>
          </View>

          {item.instructions && (
            <View style={[styles.medicationRow, { marginTop: 8, alignItems: 'flex-start' }]}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} style={[styles.medicationIcon, { marginTop: 2 }]} />
              <Text style={[styles.medicationInstructions, { color: colors.text, flex: 1 }]}>{item.instructions}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => toggleReminder(item.id, item.reminder)}
            style={[
              styles.actionButton,
              styles.reminderButton,
              {
                backgroundColor: item.reminder ? colors.primary : 'transparent',
                borderColor: item.reminder ? colors.primary : colors.border,
              },
            ]}
          >
            <Ionicons name={item.reminder ? 'notifications' : 'notifications-off'} size={18} color={item.reminder ? 'white' : colors.primary} style={styles.actionButtonIcon} />
            <Text style={[styles.actionButtonText, { color: item.reminder ? 'white' : colors.primary }]}>{item.reminder ? 'Reminder On' : 'Reminder Off'}</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} onPress={() => handleEditMedication(item)} style={[styles.actionButton, styles.editButton]}>
            <Ionicons name="create-outline" size={18} color={colors.primary} style={styles.actionButtonIcon} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert('Delete Medication', 'Are you sure you want to delete this medication?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteMedication(item.id) },
              ]);
            }}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" style={styles.actionButtonIcon} />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Medications</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={medications}
        renderItem={renderMedicationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={50} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No medications added yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.text }]}>Tap the + button to add a new medication</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchMedications} tintColor={colors.primary} />}
      />

      <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => { Keyboard.dismiss(); setModalVisible(false); }}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); }}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalContent, { backgroundColor: colors.card, opacity: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }) }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{isEditing ? 'Edit Medication' : 'Add Medication'}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalVisible(false);
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
                <ScrollView
                  ref={ref => (scrollRef.current = ref)}
                  style={styles.modalBody}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                      <Ionicons name="medkit-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderColor: colors.border,
                            paddingLeft: 40,
                          },
                        ]}
                        placeholder="Medication Name"
                        placeholderTextColor={colors.textSecondary}
                        value={newMedication.name}
                        onChangeText={text => setNewMedication({ ...newMedication, name: text })}
                        returnKeyType="next"
                        onSubmitEditing={() => {
                          // focus dosage next (if you add a ref)
                        }}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Ionicons name="speedometer-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderColor: colors.border,
                            paddingLeft: 40,
                          },
                        ]}
                        placeholder="Dosage (e.g., 10mg)"
                        placeholderTextColor={colors.textSecondary}
                        value={newMedication.dosage}
                        onChangeText={text => setNewMedication({ ...newMedication, dosage: text })}
                      />
                    </View>

                    <View style={[styles.inputContainer, { marginBottom: 16 }]}>
                      <Ionicons name="repeat-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                      <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Picker
                          selectedValue={newMedication.frequency}
                          onValueChange={(itemValue: string) => setNewMedication({ ...newMedication, frequency: itemValue })}
                          style={{ color: colors.text, flex: 1, paddingLeft: 8 }}
                          dropdownIconColor={colors.text}
                        >
                          {frequencies.map(freq => (
                            <Picker.Item key={freq} label={freq} value={freq} color={colors.text} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    <View style={[styles.inputContainer, { marginBottom: 16 }]}>
                      <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                      <TouchableOpacity
                        ref={timeInputRef}
                        style={[
                          styles.timeInput,
                          {
                            borderColor: showTimePicker ? colors.primary : colors.border,
                            backgroundColor: colors.background,
                            flex: 1,
                            paddingLeft: 40,
                          },
                        ]}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={{ color: newMedication.time ? colors.text : colors.textSecondary, fontSize: 16 }}>
                          {newMedication.time
                            ? (() => {
                                const [hours, minutes] = newMedication.time.split(':').map(Number);
                                const period = hours >= 12 ? 'PM' : 'AM';
                                const hours12 = hours % 12 || 12;
                                return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
                              })()
                            : 'Select time'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                      <View style={styles.timePickerContainer}>
                        {showTimePicker && (
                          <>
                            <DateTimePicker
                              value={
                                newMedication.time
                                  ? (() => {
                                      const [hours, minutes] = newMedication.time.split(':').map(Number);
                                      const date = new Date();
                                      date.setHours(hours, minutes);
                                      return date;
                                    })()
                                  : new Date()
                              }
                              mode="time"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              textColor={colors.text}
                              themeVariant={isDark ? 'dark' : 'light'}
                              onChange={(event, time) => {
                                if (time) {
                                  const hours = time.getHours().toString().padStart(2, '0');
                                  const minutes = time.getMinutes().toString().padStart(2, '0');
                                  const timeString = `${hours}:${minutes}`;
                                  setNewMedication({ ...newMedication, time: timeString });
                                }
                              }}
                            />
                            <View style={styles.timePickerActions}>
                              <TouchableOpacity
                                style={[styles.doneButton, { backgroundColor: colors.primary }]}
                                onPress={() => {
                                  setShowTimePicker(false);
                                  Keyboard.dismiss();
                                }}
                              >
                                <Text style={styles.doneButtonText}>Done</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    <View style={[styles.inputContainer, { marginBottom: 16 }]}>
                      <Ionicons name="document-text-outline" size={20} color={colors.primary} style={[styles.inputIcon, { marginTop: 12 }]} />
                      <TextInput
                        ref={ref => (instructionsRef.current = ref)}
                        style={[
                          styles.input,
                          styles.multilineInput,
                          {
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderColor: colors.border,
                            paddingLeft: 40,
                            textAlignVertical: 'top',
                            minHeight: 100,
                          },
                        ]}
                        placeholder="Instructions (optional)"
                        placeholderTextColor={colors.textSecondary}
                        value={newMedication.instructions}
                        onChangeText={text => setNewMedication({ ...newMedication, instructions: text })}
                        multiline
                        numberOfLines={4}
                        onFocus={onInstructionsFocus}
                        // allow keyboard to be dismissed by Back button (handled globally)
                      />
                      {/* small clear button inside input (UX) */}
                      {newMedication.instructions ? (
                        <TouchableOpacity
                          style={{ position: 'absolute', right: 12, top: 12 }}
                          onPress={() => setNewMedication({ ...newMedication, instructions: '' })}
                        >
                          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={[styles.reminderContainer, { backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="notifications-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
                        <View>
                          <Text style={[styles.reminderText, { color: colors.text, fontSize: 16, fontWeight: '500', marginBottom: 4 }]}>Set Reminder</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{newMedication.reminder ? 'Enabled' : 'Disabled'}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setNewMedication({ ...newMedication, reminder: !newMedication.reminder })}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.toggle, { backgroundColor: newMedication.reminder ? colors.primary : '#E2E8F0' }]}>
                          <View style={[styles.toggleCircle, { transform: [{ translateX: newMedication.reminder ? 20 : 0 }], backgroundColor: 'white' }]} />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        {
                          backgroundColor: colors.primary,
                          opacity: isLoading ? 0.7 : 1,
                          flexDirection: 'row',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: 50,
                          borderRadius: 12,
                          marginTop: 8,
                        },
                      ]}
                      onPress={handleSaveMedication}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="add-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
                          <Text style={[styles.modalButtonText, { color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' }]}>
                            {isEditing ? 'Update Medication' : 'Add Medication'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                {/* Keyboard accessory: Close keyboard button — appears when keyboard is open */}
                {keyboardOpen && (
                  <View style={[styles.keyboardAccessory, { bottom: Platform.OS === 'ios' ? keyboardHeight - 10 : keyboardHeight }]}>
                    <TouchableOpacity onPress={closeKeyboard} style={[styles.accessoryButton, { backgroundColor: colors.primary }]}>
                      <Text style={{ color: 'white', fontWeight: '600' }}>Close Keyboard</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </KeyboardAvoidingView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      padding: 16,
    },
    medicationItem: {
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    medicationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      flexWrap: 'wrap',
    },
    medicationIcon: {
      marginRight: 12,
      width: 24,
      textAlign: 'center',
    },
    medicationInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
      marginBottom: 4,
      backgroundColor: colors.background,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    medicationInfoText: {
      fontSize: 14,
      marginLeft: 4,
    },
    medicationHeader: {
      padding: 16,
      paddingBottom: 12,
    },
    medicationName: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
      color: colors.text,
      marginRight: 8,
    },
    medicationDosage: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    medicationInstructions: {
      fontSize: 14,
      lineHeight: 20,
    },
    medicationActions: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginTop: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
    },
    deleteButton: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FECACA',
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignSelf: 'flex-start',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      marginTop: 10,
      fontSize: 16,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    emptySubtext: {
      marginTop: 5,
      fontSize: 14,
      textAlign: 'center',
      opacity: 0.7,
    },
    reminderButton: {
      padding: 8,
      borderRadius: 20,
      marginLeft: 10,
    },
    modalButton: {
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
      backgroundColor: '#4CAF50',
    },
    modalButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: '#4B5563',
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
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: 'white',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '90%',
      width: '100%',
    },
    modalBody: {
      paddingBottom: 20,
    },
    formContainer: {
      paddingBottom: 20,
    },
    closeButton: {
      padding: 8,
      margin: -8,
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
    inputContainer: {
      marginBottom: 16,
      position: 'relative',
    },
    inputIcon: {
      position: 'absolute',
      left: 12,
      top: 12,
      zIndex: 1,
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      backgroundColor: 'transparent',
      color: colors.text,
      minHeight: 50,
    },
    multilineInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    pickerContainer: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      overflow: 'hidden',
      justifyContent: 'center',
      minHeight: 50,
    },
    timePickerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    timeInput: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      flex: 1,
      fontSize: 16,
      backgroundColor: 'transparent',
      color: colors.text,
      justifyContent: 'space-between',
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 50,
      paddingLeft: 40,
    },
    timePickerActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 8,
      paddingHorizontal: 4,
    },
    doneButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 100,
    },
    doneButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
      backgroundColor: colors.background,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      justifyContent: 'center',
      backgroundColor: 'transparent',
      minHeight: 36,
      minWidth: 36,
    },
    reminderButtonLower: {
      minWidth: 120,
    },
    editButton: {
      borderColor: colors.primary,
    },
    actionButtonIcon: {
      marginRight: 6,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '500',
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
    reminderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reminderText: {},
    // accessory & keyboard helpers
    keyboardAccessory: {
      position: 'absolute',
      left: 0,
      right: 0,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'flex-end',
    },
    accessoryButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 120,
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
      marginRight: 12,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
    },
    headerRight: {
      width: 40,
    },
  });

export default MedicationScreen;
