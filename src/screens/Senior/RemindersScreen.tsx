// RemindersScreen.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  Vibration,
  Platform,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/translation/TranslationContext';
import { useCachedTranslation } from '../../hooks/useCachedTranslation';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { reminderService, Reminder as ReminderType } from '../../services/reminderService';
import { useAuth } from '../../hooks/useAuth';

// Notification handler (foreground behavior)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,    // Show banner when app is in foreground
    shouldShowList: true,      // Show in notification center
    shouldPlaySound: true,     // Play sound when notification is received
    shouldSetBadge: false,     // Don't update app badge
  }),
});

// Local reminder type that extends the database type
interface LocalReminder extends Omit<ReminderType, 'date'> {
  date: string; // Store as ISO string for consistency
  notificationId?: string; // Alias for notification_id
}

type RemindersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Reminders'>;
// Removed local storage key as we're using Supabase

// Haptics / vibration helper
const triggerNotificationFeedback = async () => {
  try {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 120);
    } else {
      Vibration.vibrate([0, 300, 200, 300], false);
    }
  } catch (e) {
    console.warn('Haptic error', e);
    Vibration.vibrate(300);
  }
};

// Helper: parse "hh:mm AM/PM" to {hours, minutes}
const parseTimeString = (timeStr = '08:00 AM') => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
};

// Helper: convert "hh:mm AM/PM" to Date (next occurrence)
const timeStringToDate = (timeStr = '08:00 AM') => {
  const now = new Date();
  const { hours, minutes } = parseTimeString(timeStr);
  const d = new Date(now);
  d.setHours(hours, minutes, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
};

const RemindersScreen: React.FC = () => {
  const navigation = useNavigation<RemindersScreenNavigationProp>();
  const { isDark } = useTheme();
  const { currentLanguage } = useTranslation();

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const { user } = useAuth();
  const [reminders, setReminders] = useState<LocalReminder[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingReminder, setEditingReminder] = useState<LocalReminder | null>(null);
  const [newReminder, setNewReminder] = useState<Partial<LocalReminder>>({
    title: '',
    time: '08:00 AM',
    date: new Date(),
    type: 'medication',
    enabled: true,
  });
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load reminders from Supabase
  const loadReminders = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await reminderService.getReminders();
      // Add date property for local time handling
      const remindersWithDate = data.map(reminder => ({
        ...reminder,
        date: timeStringToDate(reminder.time).toISOString(),
        notificationId: reminder.notification_id || undefined
      }));
      setReminders(remindersWithDate);
      
      // Schedule notifications for all enabled reminders
      await scheduleAllReminders(remindersWithDate);
    } catch (error) {
      console.error('Error loading reminders:', error);
      Alert.alert('Error', 'Failed to load reminders');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Schedule a notification for a reminder (returns notificationId or null)
  const scheduleNotification = useCallback(
    async (reminder: LocalReminder) => {
      try {
        // Request/check permissions
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          if (req.status !== 'granted') {
            console.warn('Notifications permission denied');
            return null;
          }
        }

        // Create Android channel if needed
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('reminders', {
            name: 'Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 300, 200, 300],
            enableVibrate: true,
            sound: 'default',
          });
        }

        // Cancel existing scheduled notification for this reminder if exists
        if (reminder.notification_id) {
          try {
            await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
          } catch (e) {
            console.warn('Failed to cancel existing notification:', e);
          }
        }

        // Compute next occurrence
        const scheduledDate = timeStringToDate(reminder.time);
        const now = new Date();
        
        // If the time is in the past today, schedule for tomorrow
        if (scheduledDate <= now) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        // Calculate delay in milliseconds until the notification time
        const delayMs = scheduledDate.getTime() - now.getTime();
        
        // Ensure we have a positive delay (at least 1 second)
        const triggerSeconds = Math.max(1, Math.floor(delayMs / 1000));
        
        const content: any = {
          title: `CareTrek Reminder: ${reminder.title || 'Reminder'}`,
          body: `Time for your ${reminder.type === 'medication' ? 'medication' : 'activity'}.`,
          data: { reminderId: reminder.id },
          sound: 'default',
        };

        if (Platform.OS === 'android') {
          content.channelId = 'reminders';
        }

        console.log(`Scheduling notification in ${triggerSeconds} seconds (${new Date(now.getTime() + (triggerSeconds * 1000)).toLocaleString()})`);
        
        // Schedule the notification with a time interval trigger
        const notificationId = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            seconds: triggerSeconds,
            repeats: true
          },
        });
        
        console.log(`Scheduled notification ${notificationId} for ${new Date(now.getTime() + (triggerSeconds * 1000)).toLocaleString()}`);

        // Return the notification ID to be saved in the database by the caller
        return notificationId;
      } catch (e) {
        console.warn('scheduleNotification error', e);
        return null;
      }
    },
    [] // No dependencies needed
  );

  // Schedule notifications for all enabled reminders
  const scheduleAllReminders = useCallback(async (remindersToSchedule = reminders) => {
    if (!remindersToSchedule.length) return;

    for (const reminder of remindersToSchedule) {
      if (reminder.enabled && !reminder.notification_id) {
        try {
          const notificationId = await scheduleNotification(reminder);
          if (notificationId) {
            await reminderService.updateNotificationId(reminder.id, notificationId);
            // Update local state to avoid refetching
            setReminders(prev => 
              prev.map(r => 
                r.id === reminder.id 
                  ? { ...r, notification_id: notificationId } 
                  : r
              )
            );
          }
        } catch (error) {
          console.error(`Error scheduling reminder ${reminder.id}:`, error);
        }
      }
    }
  }, [reminders]);

  // Stop (disable) a reminder
  const handleStopReminder = useCallback(
    async (reminderId: string) => {
      try {
        await reminderService.toggleReminder(reminderId, false);
        
        // Cancel notification if exists
        const target = reminders.find(r => r.id === reminderId);
        if (target?.notification_id) {
          try {
            await Notifications.cancelScheduledNotificationAsync(target.notification_id);
            // Update local state
            setReminders(prev => 
              prev.map(r => 
                r.id === reminderId 
                  ? { ...r, enabled: false, notification_id: null } 
                  : r
              )
            );
          } catch (e) {
            console.warn('Failed to cancel notification:', e);
          }
        } else {
          // Just update the enabled status
          setReminders(prev => 
            prev.map(r => 
              r.id === reminderId 
                ? { ...r, enabled: false } 
                : r
            )
          );
        }
      } catch (error) {
        console.error('Error stopping reminder:', error);
        Alert.alert('Error', 'Failed to stop reminder');
      }
    },
    [reminders]
  );

  // Snooze once for X minutes
  const handleSnoozeReminder = useCallback(
    async (reminderId: string, minutes: number) => {
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) return;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Snoozed: ${reminder.title || 'Reminder'}`,
            body: `Snoozed for ${minutes} minutes`,
            data: { reminderId: reminder.id, isSnoozed: true },
            sound: 'default',
          },
          trigger: { seconds: minutes * 60 } as any,
        });
      } catch (e) {
        console.warn('Snooze failed', e);
      }
    },
    [reminders]
  );

  // Show action choices when tapping notification
  const showReminderActions = useCallback(
    (reminderId: string) => {
      Alert.alert('Reminder', 'What would you like to do?', [
        {
          text: 'Stop Reminder',
          style: 'destructive',
          onPress: () => handleStopReminder(reminderId),
        },
        {
          text: 'Snooze 5m',
          onPress: () => handleSnoozeReminder(reminderId, 5),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [handleStopReminder, handleSnoozeReminder]
  );

  // Setup notification listeners
  const setupNotificationListeners = useCallback(() => {
    // Foreground: play feedback
    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      // Quick feedback
      triggerNotificationFeedback();
      if (Platform.OS === 'android') Vibration.vibrate([0, 300, 200], false);
    });

    // When user taps notification or action
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async response => {
      const reminderId = response.notification.request.content.data?.reminderId;
      const actionId = response.actionIdentifier;

      // feedback
      await triggerNotificationFeedback();

      // If action buttons used (iOS/Android), interpret them:
      if (actionId === 'complete') {
        if (reminderId) handleStopReminder(reminderId.toString());
        return;
      } else if (actionId === 'snooze') {
        if (reminderId) handleSnoozeReminder(reminderId.toString(), 5);
        return;
      }

      // default - open actions
      if (reminderId) showReminderActions(reminderId.toString());
    });

    // return cleanup (optional)
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      notificationListener.current = null;
      responseListener.current = null;
    };
  }, [handleStopReminder, handleSnoozeReminder, showReminderActions]);

  // Cleanup helper
  const cleanupNotificationListeners = useCallback(() => {
    try {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    } catch (e) {
      // ignore
    } finally {
      notificationListener.current = null;
      responseListener.current = null;
    }
  }, []);

  // Load reminders on mount and when user changes
  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user, loadReminders]);

  // Schedule notifications when reminders change
  useEffect(() => {
    if (reminders.length > 0) {
      scheduleAllReminders();
    }
  }, [reminders]);

  // Setup notification listeners
  useFocusEffect(
    useCallback(() => {
      const cleanup = setupNotificationListeners();
      return () => {
        cleanup();
        cleanupNotificationListeners();
      };
    }, [setupNotificationListeners, cleanupNotificationListeners])
  );

  // Toggle enabled/disabled status
  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const newEnabledState = !reminder.enabled;
    
    try {
      // Optimistic update
      setReminders(prev => 
        prev.map(r => 
          r.id === id 
            ? { ...r, enabled: newEnabledState } 
            : r
        )
      );

      // Update in database
      await reminderService.toggleReminder(id, newEnabledState);

      // Handle notification
      if (newEnabledState) {
        // Schedule new notification
        const notificationId = await scheduleNotification(reminder);
        if (notificationId) {
          await reminderService.updateNotificationId(id, notificationId);
          // Update local state with new notification ID
          setReminders(prev => 
            prev.map(r => 
              r.id === id 
                ? { ...r, notification_id: notificationId } 
                : r
            )
          );
        }
      } else if (reminder.notification_id) {
        // Cancel existing notification
        try {
          await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
          // Update local state to remove notification ID
          setReminders(prev => 
            prev.map(r => 
              r.id === id 
                ? { ...r, notification_id: null } 
                : r
            )
          );
        } catch (e) {
          console.warn('Failed to cancel notification:', e);
        }
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
      // Revert optimistic update on error
      setReminders(prev => 
        prev.map(r => 
          r.id === id 
            ? { ...r, enabled: !newEnabledState } 
            : r
        )
      );
      Alert.alert('Error', 'Failed to update reminder status');
    }
  };

  // Add reminder
  const addReminder = async () => {
    if (!newReminder.title || !newReminder.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the reminder');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const reminderData = {
        title: newReminder.title!.trim(),
        time: newReminder.time || '08:00 AM',
        type: (newReminder.type as 'medication' | 'activity') || 'medication',
        enabled: newReminder.enabled ?? true,
      };

      // Add to database
      const createdReminder = await reminderService.createReminder(reminderData);

      // Schedule notification if enabled
      let notificationId = null;
      if (reminderData.enabled) {
        // Create a proper reminder object for scheduling
        const reminderForScheduling: LocalReminder = {
          ...createdReminder,
          date: timeStringToDate(createdReminder.time).toISOString(),
          notification_id: null,
          notificationId: undefined
        };
        
        notificationId = await scheduleNotification(reminderForScheduling);
        
        if (notificationId) {
          // Update the reminder with the notification ID
          await reminderService.updateNotificationId(createdReminder.id, notificationId);
          createdReminder.notification_id = notificationId;
        }
      }

      // Add to local state with the updated reminder
      setReminders(prev => [
        ...prev,
        {
          ...createdReminder,
          date: timeStringToDate(createdReminder.time).toISOString(),
          notificationId: notificationId || undefined
        }
      ]);

      // Reset form and close
      setNewReminder({ title: '', time: '08:00 AM', date: new Date().toISOString(), type: 'medication', enabled: true });
      setIsFormVisible(false);
      
      // Haptic feedback
      await triggerNotificationFeedback();
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alert.alert('Error', 'Failed to add reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing reminder
  const updateReminder = async () => {
    if (!editingReminder) return;
    if (!editingReminder.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { id, ...updateData } = editingReminder;
      
      // Update in database
      const updatedReminder = await reminderService.updateReminder(id, {
        title: updateData.title.trim(),
        time: updateData.time,
        type: updateData.type,
        enabled: updateData.enabled,
      });

      // Handle notification
      let notificationId = updatedReminder.notification_id || null;
      
      if (updatedReminder.enabled) {
        // Cancel existing notification if exists
        if (notificationId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
          } catch (e) {
            console.warn('Failed to cancel existing notification:', e);
          }
        }
        
        // Schedule new notification
        notificationId = await scheduleNotification({
          ...updatedReminder,
          date: timeStringToDate(updatedReminder.time),
        });
        
        if (notificationId) {
          // Update notification ID in database
          await reminderService.updateNotificationId(id, notificationId);
        }
      } else if (notificationId) {
        // Disabled - cancel notification
        try {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
          notificationId = null;
          // Update in database
          await reminderService.updateNotificationId(id, null);
        } catch (e) {
          console.warn('Failed to cancel notification:', e);
        }
      }

      // Update local state
      // setReminders(prev => 
      //   prev.map(r => 
      //     r.id === id 
      //       ? { 
      //           ...updatedReminder, 
      //           date: timeStringToDate(updatedReminder.time),
      //           notificationId: notificationId || undefined
      //         } 
      //       : r
      //   )
      // );

      // Close form and reset
      setEditingReminder(null);
      setIsFormVisible(false);
      
      // Haptic feedback
      await triggerNotificationFeedback();
    } catch (error) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', 'Failed to update reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete reminder
  const deleteReminder = (id: string) => {
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
              const target = reminders.find(r => r.id === id);
              
              // Cancel notification if exists
              if (target?.notification_id) {
                try {
                  await Notifications.cancelScheduledNotificationAsync(target.notification_id);
                } catch (e) {
                  console.warn('Failed to cancel notification on delete:', e);
                }
              }
              
              // Delete from database
              await reminderService.deleteReminder(id);
              
              // Update local state
              setReminders(prev => prev.filter(r => r.id !== id));
              
              // Haptic feedback
              await triggerNotificationFeedback();
            } catch (error) {
              console.error('Error deleting reminder:', error);
              Alert.alert('Error', 'Failed to delete reminder');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Time picker handlers
  const showTimePickerDialog = () => setShowTimePicker(true);
  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (!selectedDate) return;

    const hours = selectedDate.getHours();
    const minutes = selectedDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedTime = `${formattedHours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
    const newDate = new Date(selectedDate);

    if (editingReminder) {
      setEditingReminder(prev => ({ ...prev!, time: formattedTime, date: newDate }));
    } else {
      setNewReminder(prev => ({ ...prev, time: formattedTime, date: newDate }));
    }
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder({ ...reminder, date: reminder.date ? new Date(reminder.date) : timeStringToDate(reminder.time) });
    setIsFormVisible(true);
  };
  const closeEditModal = () => {
    setEditingReminder(null);
    setIsFormVisible(false);
  };

  // Translations
  const { translatedText: remindersText } = useCachedTranslation('Reminders', currentLanguage);
  const { translatedText: backText } = useCachedTranslation('Back', currentLanguage);
  const { translatedText: addReminderText } = useCachedTranslation('Add Reminder', currentLanguage);
  const { translatedText: editReminderText } = useCachedTranslation('Edit Reminder', currentLanguage);
  const { translatedText: deleteText } = useCachedTranslation('Delete', currentLanguage);
  const { translatedText: cancelText } = useCachedTranslation('Cancel', currentLanguage);
  const { translatedText: saveText } = useCachedTranslation('Save', currentLanguage);
  const { translatedText: titleText } = useCachedTranslation('Title', currentLanguage);
  const { translatedText: timeText } = useCachedTranslation('Time', currentLanguage);
  const { translatedText: typeText } = useCachedTranslation('Type', currentLanguage);
  const { translatedText: medicationText } = useCachedTranslation('Medication', currentLanguage);
  const { translatedText: activityText } = useCachedTranslation('Activity', currentLanguage);

  // Render item
  const renderReminder = ({ item }: { item: LocalReminder }) => (
    <TouchableOpacity
      style={[styles.reminderCard, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
      onPress={() => openEditModal(item)}
      activeOpacity={0.8}
    >
      <View style={styles.reminderLeft}>
        <View
          style={[
            styles.reminderIconContainer,
            {
              backgroundColor: item.type === 'medication' ? (isDark ? '#FEB2B233' : '#FED7D7') : (isDark ? '#9AE6B433' : '#C6F6D5'),
            },
          ]}
        >
          <Ionicons
            name={item.type === 'medication' ? 'medkit' : 'walk'}
            size={20}
            color={item.type === 'medication' ? (isDark ? '#FC8181' : '#E53E3E') : (isDark ? '#68D391' : '#38A169')}
          />
        </View>

        <View style={styles.reminderTextContainer}>
          <Text style={[styles.reminderTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{item.title}</Text>
          <View style={styles.reminderTimeContainer}>
            <Ionicons name="time-outline" size={14} color={isDark ? '#A0AEC0' : '#4A5568'} style={styles.timeIcon} />
            <Text style={[styles.reminderTime, { color: isDark ? '#A0AEC0' : '#4A5568' }]}>{item.time}</Text>
          </View>
        </View>
      </View>

      <View style={styles.reminderActions}>
        <Switch
          value={item.enabled}
          onValueChange={() => toggleReminder(item.id)}
          trackColor={{ false: isDark ? '#4A5568' : '#E2E8F0', true: isDark ? '#48BB78' : '#38A169' }}
          thumbColor="#FFFFFF"
        />
        <TouchableOpacity onPress={() => deleteReminder(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={isDark ? '#FC8181' : '#E53E3E'} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderReminderForm = () => {
    const isEditing = !!editingReminder;
    const formData = (isEditing ? editingReminder : newReminder) as Partial<Reminder>;

    return (
      <View style={[styles.formContainer, { backgroundColor: isDark ? '#1A202C' : '#FFFFFF' }]}>
        <Text style={[styles.formTitle, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{isEditing ? editReminderText : addReminderText}</Text>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>{titleText}</Text>
          <View style={[styles.input, { backgroundColor: isDark ? '#2D3748' : '#EDF2F7' }]}>
            <TextInput
              style={[styles.textInput, { color: isDark ? '#E2E8F0' : '#1A202C' }]}
              value={formData.title || ''}
              onChangeText={text => (isEditing ? setEditingReminder({ ...editingReminder!, title: text }) : setNewReminder({ ...newReminder, title: text }))}
              placeholder="Enter reminder title"
              placeholderTextColor={isDark ? '#718096' : '#A0AEC0'}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>{timeText}</Text>
          <TouchableOpacity style={[styles.input, styles.timePickerButton, { backgroundColor: isDark ? '#2D3748' : '#EDF2F7' }]} onPress={showTimePickerDialog}>
            <Ionicons name="time-outline" size={20} color={isDark ? '#E2E8F0' : '#4A5568'} style={styles.timeIcon} />
            <Text style={[styles.timeText, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>{formData.time || '08:00 AM'}</Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker value={formData.date || new Date()} mode="time" display="spinner" onChange={onTimeChange} textColor={isDark ? '#E2E8F0' : '#1A202C'} themeVariant={isDark ? 'dark' : 'light'} />
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>{typeText}</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, formData.type === 'medication' ? { backgroundColor: isDark ? '#2F855A' : '#38A169' } : { backgroundColor: isDark ? '#2D3748' : '#EDF2F7' }]}
              onPress={() => (isEditing ? setEditingReminder({ ...editingReminder!, type: 'medication' }) : setNewReminder({ ...newReminder, type: 'medication' }))}
            >
              <Ionicons name="medkit" size={18} color={formData.type === 'medication' ? '#FFFFFF' : isDark ? '#E2E8F0' : '#4A5568'} />
              <Text style={[styles.typeButtonText, { color: formData.type === 'medication' ? '#FFFFFF' : isDark ? '#E2E8F0' : '#4A5568' }]}>{medicationText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, formData.type === 'activity' ? { backgroundColor: isDark ? '#2F855A' : '#38A169' } : { backgroundColor: isDark ? '#2D3748' : '#EDF2F7' }]}
              onPress={() => (isEditing ? setEditingReminder({ ...editingReminder!, type: 'activity' }) : setNewReminder({ ...newReminder, type: 'activity' }))}
            >
              <Ionicons name="walk" size={18} color={formData.type === 'activity' ? '#FFFFFF' : isDark ? '#E2E8F0' : '#4A5568'} />
              <Text style={[styles.typeButtonText, { color: formData.type === 'activity' ? '#FFFFFF' : isDark ? '#E2E8F0' : '#4A5568' }]}>{activityText}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formButtons}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: isDark ? '#4A5568' : '#E2E8F0' }]}
            onPress={() => {
              if (isEditing) closeEditModal();
              else {
                setNewReminder({ title: '', time: '08:00 AM', date: new Date(), type: 'medication', enabled: true });
                setIsFormVisible(false);
              }
            }}
          >
            <Text style={[styles.cancelButtonText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>{cancelText}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: isDark ? '#2F855A' : '#38A169' }]} onPress={isEditing ? updateReminder : addReminder}>
            <Text style={styles.saveButtonText}>{isEditing ? saveText : addReminderText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleBack = () => navigation.goBack();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
      <TouchableOpacity style={[styles.backButton, { borderColor: isDark ? '#4A5568' : '#E2E8F0' }]} onPress={handleBack} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color={isDark ? '#E2E8F0' : '#4A5568'} />
        <Text style={[styles.backButtonText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>{backText}</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#2F855A' : '#2F855A' }]}>{remindersText}</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: isDark ? '#2F855A' : '#38A169' }]}
          onPress={() => {
            setNewReminder({ title: '', time: '08:00 AM', date: new Date(), type: 'medication', enabled: true });
            setEditingReminder(null);
            setIsFormVisible(true);
          }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>{addReminderText}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#2F855A' : '#38A169'} />
          <Text style={[styles.loadingText, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
            Loading reminders...
          </Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          renderItem={renderReminder}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.reminderList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off" size={48} color={isDark ? '#4A5568' : '#A0AEC0'} />
              <Text style={[styles.emptyText, { color: isDark ? '#A0AEC0' : '#4A5568' }]}>
                No reminders set up yet
              </Text>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: isDark ? '#2F855A' : '#38A169', marginTop: 16 }]}
                onPress={() => setIsFormVisible(true)}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Your First Reminder</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadReminders}
              colors={[isDark ? '#2F855A' : '#38A169']}
              tintColor={isDark ? '#2F855A' : '#38A169'}
            />
          }
        />
      )}

      {(isFormVisible || editingReminder) && <View style={styles.modalOverlay}>{renderReminderForm()}</View>}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backButtonText: { marginLeft: 8, fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2F855A' },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center' },
  addButtonText: { color: 'white', marginLeft: 6, fontWeight: '500', fontSize: 14 },
  reminderList: { padding: 16, paddingBottom: 24 },
  reminderCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2 
  },
  reminderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reminderTextContainer: { flex: 1 },
  reminderTimeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timeIcon: { marginRight: 4 },
  reminderIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  reminderTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  reminderTime: { fontSize: 14, opacity: 0.8 },
  reminderActions: { flexDirection: 'row', alignItems: 'center' },
  deleteButton: { marginLeft: 12, padding: 6 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  },
  emptyText: { 
    marginTop: 16, 
    fontSize: 16, 
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  formContainer: { 
    width: '100%', 
    borderRadius: 16, 
    padding: 24, 
    maxWidth: 400, 
    maxHeight: '90%',
    marginHorizontal: 16,
  },
  formTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 10, padding: 12, fontSize: 16 },
  textInput: { fontSize: 16, padding: 0 },
  timePickerButton: { flexDirection: 'row', alignItems: 'center' },
  timeText: { marginLeft: 10, fontSize: 16 },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  typeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, marginHorizontal: 4 },
  typeButtonText: { marginLeft: 8, fontSize: 14, fontWeight: '500' },
  formButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  cancelButton: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center', marginRight: 12 },
  cancelButtonText: { fontSize: 16, fontWeight: '500' },
  saveButton: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '500' },
});

export default RemindersScreen;
