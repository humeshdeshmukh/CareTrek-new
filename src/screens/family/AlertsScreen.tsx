import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useTranslation } from 'react-i18next';

dayjs.extend(relativeTime);

/* ---------------- Types ---------------- */
type AlertType =
  | 'medication'
  | 'fall'
  | 'heart'
  | 'location'
  | 'battery'
  | 'general'
  | 'appointment'
  | 'vital';

type PriorityType = 'high' | 'medium' | 'low';
type FilterType = 'all' | 'unread' | PriorityType | AlertType;

interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: PriorityType;
  seniorName?: string;
  seniorAvatar?: string;
  details?: string;
}

/* --------- Theme helpers (defensive) --------- */
const isHex = (s?: string) => typeof s === 'string' && /^#([A-Fa-f0-9]{3,8})$/.test(s.trim());
const isRgb = (s?: string) => typeof s === 'string' && /^rgba?\(/i.test(s.trim());
const isColorName = (s?: string) => typeof s === 'string' && /^[a-zA-Z]+$/.test(s.trim());

function extractColor(value: any, fallback = '#000000'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    const s = value.trim();
    if (isHex(s) || isRgb(s) || isColorName(s) || s.length > 0) return s;
    return fallback;
  }
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const priorityKeys = ['hex', 'color', 'value', 'main', 'DEFAULT', 'default', 'light', 'dark', 'primary'];
    for (const k of priorityKeys) {
      if (Object.prototype.hasOwnProperty.call(value, k)) {
        const candidate = extractColor(value[k], null as any);
        if (candidate) return candidate;
      }
    }
    for (const k in value) {
      if (Object.prototype.hasOwnProperty.call(value, k)) {
        const candidate = extractColor(value[k], null as any);
        if (candidate) return candidate;
      }
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        const candidate = extractColor(v, null as any);
        if (candidate) return candidate;
      }
    }
  }
  return fallback;
}

/* ---------------- Screen ---------------- */
const AlertsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const themeHook: any = useTheme();
  const { t } = useTranslation();

  // Defensive theme extraction
  const isDark = !!themeHook?.isDark;
  const colorsObj = themeHook?.colors ?? themeHook?.theme ?? themeHook ?? {};
  const bgColor = extractColor(colorsObj.background, isDark ? '#0f172a' : '#ffffff');
  const cardColor = extractColor(colorsObj.card, isDark ? '#1F2937' : '#FFFFFF');
  const textColor = extractColor(colorsObj.text, isDark ? '#E2E8F0' : '#1A202C');
  const primaryColor = extractColor(colorsObj.primary, isDark ? '#4FD1C5' : '#2C7A7B');
  const borderColor = extractColor(colorsObj.border, isDark ? '#2D3748' : 'rgba(0,0,0,0.08)');
  const tertiaryText = extractColor(colorsObj.textSecondary ?? colorsObj.textTertiary, isDark ? '#9CA3AF' : '#6B7280');

  // State
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  // i18n fallbacks
  const strings = {
    header: t('Alerts') || 'Alerts',
    markAll: t('Mark all as read') || 'Mark all as read',
    all: t('All') || 'All',
    unread: t('Unread') || 'Unread',
    high: t('High') || 'High',
    medium: t('Medium') || 'Medium',
    low: t('Low') || 'Low',
    medication: t('Medication') || 'Medication',
    fall: t('Fall') || 'Fall',
    heart: t('Heart') || 'Heart',
    location: t('Location') || 'Location',
    battery: t('Battery') || 'Battery',
    appointment: t('Appointment') || 'Appointment',
    vital: t('Vital') || 'Vital',
    noAlerts: t('No alerts found') || 'No alerts found',
    retry: t('Retry') || 'Retry',
    details: t('Details') || 'Details',
    close: t('Close') || 'Close',
  };

  // Helpers
  const formatRelative = (date?: Date) => (date ? dayjs(date).fromNow() : 'N/A');
  const formatDate = (date?: Date) => (date ? dayjs(date).format('MMM D, YYYY h:mm A') : 'N/A');

  const getAlertIcon = (type: AlertType): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'fall':
        return 'error';
      case 'medication':
        return 'medication';
      case 'heart':
        return 'favorite';
      case 'location':
        return 'location-on';
      case 'battery':
        return 'battery-alert';
      case 'appointment':
        return 'event';
      case 'vital':
        return 'monitor-heart';
      case 'general':
      default:
        return 'notifications';
    }
  };

  const priorityColor = (p: PriorityType) => {
    switch (p) {
      case 'high':
        return '#F56565';
      case 'medium':
        return '#D69E2E';
      case 'low':
      default:
        return '#48BB78';
    }
  };

  // Fetch alerts (mock)
  const fetchAlerts = useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      const mock: AlertItem[] = [
        {
          id: '1',
          type: 'fall',
          title: t('Fall Detected') || 'Fall Detected',
          message: t('A potential fall was detected. Please check immediately.') || 'A potential fall was detected. Please check immediately.',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          read: false,
          priority: 'high',
          details: t('Fall detected at 2:30 PM. Impact force was 3.5g.') || 'Fall detected at 2:30 PM. Impact force was 3.5g.',
          seniorName: 'Bhushan Mahant',
        },
        {
          id: '2',
          type: 'medication',
          title: t('Medication Missed') || 'Medication Missed',
          message: t('Afternoon medication was not taken.') || 'Afternoon medication was not taken.',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          read: false,
          priority: 'medium',
          details: t('Lisinopril 10mg was scheduled for 2:00 PM') || 'Lisinopril 10mg was scheduled for 2:00 PM',
          seniorName: 'Mary Smith',
        },
        {
          id: '3',
          type: 'heart',
          title: t('High Heart Rate') || 'High Heart Rate',
          message: t('Heart rate is elevated (112 BPM).') || 'Heart rate is elevated (112 BPM).',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          read: true,
          priority: 'high',
          details: t('Normal range: 60-100 BPM\nLast reading: 112 BPM at 1:45 PM') || 'Normal range: 60-100 BPM\nLast reading: 112 BPM at 1:45 PM',
          seniorName: 'Mary Smith',
        },
        {
          id: '4',
          type: 'location',
          title: t('Unusual Location') || 'Unusual Location',
          message: t('Left the usual area at 10:30 AM') || 'Left the usual area at 10:30 AM',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          read: true,
          priority: 'medium',
          details: t('Current location: Central Park\nLeft home at 10:30 AM') || 'Current location: Central Park\nLeft home at 10:30 AM',
          seniorName: 'Bhushan Mahant',
        },
        {
          id: '5',
          type: 'battery',
          title: t('Low Battery') || 'Low Battery',
          message: t('Device battery is at 15%') || 'Device battery is at 15%',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          read: true,
          priority: 'low',
          details: t('Please charge the device as soon as possible.') || 'Please charge the device as soon as possible.',
          seniorName: 'Bhushan Mahant',
        },
        {
          id: '6',
          type: 'appointment',
          title: t('Upcoming Appointment') || 'Upcoming Appointment',
          message: t('Doctor appointment tomorrow at 2:00 PM') || 'Doctor appointment tomorrow at 2:00 PM',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          read: true,
          priority: 'low',
          details: t('Dr. Smith\nCardiology Dept\n123 Medical Center') || 'Dr. Smith\nCardiology Dept\n123 Medical Center',
          seniorName: 'Mary Smith',
        },
      ];
      setAlerts(mock);
    } catch (e) {
      console.error(e);
      Alert.alert(t('Error') || 'Error', t('Failed to load alerts') || 'Failed to load alerts');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Filters
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !a.read;
      if (filter === 'high' || filter === 'medium' || filter === 'low') return a.priority === filter;
      // else treat as AlertType
      return a.type === filter;
    });
  }, [alerts, filter]);

  // Mark read helpers
  const markAsRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  // Renderers
  const renderFilterButton = (id: FilterType, label: string) => {
    const active = filter === id;
    return (
      <TouchableOpacity
        key={id}
        style={[
          styles.filterButton,
          {
            borderColor: active ? primaryColor : borderColor,
            backgroundColor: active ? primaryColor : 'transparent',
          },
        ]}
        onPress={() => setFilter(id)}
      >
        <Text style={[styles.filterButtonText, { color: active ? '#FFFFFF' : tertiaryText }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderAlertItem = ({ item }: { item: AlertItem }) => (
    <TouchableOpacity
      style={[
        styles.alertCard,
        {
          backgroundColor: cardColor,
          borderColor,
          borderLeftColor: priorityColor(item.priority),
          opacity: item.read ? 0.9 : 1,
        },
      ]}
      activeOpacity={0.85}
      onPress={() => {
        if (!item.read) markAsRead(item.id);
        setSelectedAlert(item);
        setShowAlertModal(true);
      }}
    >
      <View style={styles.alertHeader}>
        <View style={styles.alertIconContainer}>
          <MaterialIcons name={getAlertIcon(item.type)} size={20} color={!item.read ? primaryColor : tertiaryText} />
        </View>

        <Text
          style={[
            styles.alertTitle,
            {
              color: !item.read ? textColor : tertiaryText,
              fontWeight: !item.read ? '600' : '400',
            },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <Text style={[styles.alertTime, { color: tertiaryText }]}>{formatRelative(item.timestamp)}</Text>

        {!item.read && <View style={[styles.unreadDot, { backgroundColor: primaryColor }]} />}
      </View>

      <Text style={[styles.alertMessage, { color: !item.read ? textColor : tertiaryText }]} numberOfLines={2}>
        {item.message}
      </Text>
    </TouchableOpacity>
  );

  /* ---------- Empty / Loading ---------- */
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (!isLoading && alerts.length === 0) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: bgColor }]}>
        <MaterialIcons name="error-outline" size={48} color={tertiaryText} />
        <Text style={[styles.errorText, { color: textColor }]}>{strings.noAlerts}</Text>
        <TouchableOpacity style={[styles.retryButton, { borderColor: primaryColor }]} onPress={fetchAlerts}>
          <Text style={[styles.retryText, { color: primaryColor }]}>{strings.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>{strings.header}</Text>

        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead} disabled={alerts.every((a) => a.read)}>
          <Text
            style={[
              styles.markAllButtonText,
              {
                color: alerts.every((a) => a.read) ? tertiaryText : primaryColor,
              },
            ]}
          >
            {strings.markAll}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[styles.filterRow, { borderBottomColor: borderColor }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
          {renderFilterButton('all', strings.all)}
          {renderFilterButton('unread', strings.unread)}
          {renderFilterButton('high', strings.high)}
          {renderFilterButton('medium', strings.medium)}
          {renderFilterButton('low', strings.low)}
          {renderFilterButton('medication', strings.medication)}
          {renderFilterButton('fall', strings.fall)}
          {renderFilterButton('heart', strings.heart)}
          {renderFilterButton('location', strings.location)}
          {renderFilterButton('battery', strings.battery)}
          {renderFilterButton('appointment', strings.appointment)}
          {renderFilterButton('vital', strings.vital)}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(i) => i.id}
        renderItem={renderAlertItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAlerts} colors={[primaryColor]} tintColor={primaryColor} />}
      />

      {/* Details Modal */}
      <Modal visible={showAlertModal} animationType="slide" transparent onRequestClose={() => setShowAlertModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <View style={styles.modalTitleContainer}>
                <MaterialIcons
                  name={getAlertIcon(selectedAlert?.type || 'general')}
                  size={20}
                  color={priorityColor(selectedAlert?.priority || 'low')}
                  style={styles.modalIcon}
                />
                <Text style={[styles.modalTitle, { color: textColor }]} numberOfLines={2}>
                  {selectedAlert?.title || strings.details}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAlertModal(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={22} color={tertiaryText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalMeta}>
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      borderColor: priorityColor(selectedAlert?.priority || 'low'),
                      backgroundColor: `${priorityColor(selectedAlert?.priority || 'low')}22`,
                    },
                  ]}
                >
                  <Text style={[styles.priorityText, { color: priorityColor(selectedAlert?.priority || 'low') }]}>
                    {(selectedAlert?.priority || 'low').toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.modalTime, { color: tertiaryText }]}>{formatDate(selectedAlert?.timestamp)}</Text>
              </View>

              {selectedAlert?.message ? (
                <Text style={[styles.modalMessage, { color: textColor }]}>{selectedAlert.message}</Text>
              ) : null}

              {selectedAlert?.details ? (
                <View
                  style={[
                    styles.detailsContainer,
                    { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderColor: borderColor, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.detailsTitle, { color: textColor }]}>{t('Details') || 'Details'}</Text>
                  <Text style={[styles.detailsText, { color: tertiaryText }]}>{selectedAlert.details}</Text>
                </View>
              ) : null}

              {selectedAlert?.seniorName ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.detailsTitle, { color: textColor }]}>{t('Senior') || 'Senior'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    {selectedAlert.seniorAvatar ? (
                      <Image source={{ uri: selectedAlert.seniorAvatar }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }} />
                    ) : (
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          marginRight: 8,
                          backgroundColor: isDark ? '#374151' : '#E5E7EB',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="person" size={16} color={tertiaryText} />
                      </View>
                    )}
                    <Text style={{ color: textColor, fontWeight: '600' }}>{selectedAlert.seniorName}</Text>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: primaryColor }]}
                onPress={() => setShowAlertModal(false)}
              >
                <Text style={styles.actionButtonText}>{strings.close}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  markAllButton: { padding: 4 },
  markAllButtonText: { fontSize: 14, fontWeight: '500' },

  filterRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterList: { paddingHorizontal: 16 },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonText: { fontSize: 14, fontWeight: '500' },

  listContent: { padding: 16 },

  alertCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIconContainer: { marginRight: 12 },
  alertTitle: { flex: 1, fontSize: 16, marginRight: 8 },
  alertTime: { fontSize: 12, marginLeft: 'auto' },
  alertMessage: { fontSize: 14, lineHeight: 20 },

  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },

  // Empty/Loading/Error
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { marginTop: 16, fontSize: 16, textAlign: 'center' },
  retryButton: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1 },
  retryText: { fontSize: 14, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modalIcon: { marginRight: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  closeButton: { padding: 6 },
  modalBody: { padding: 16 },
  modalMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTime: { fontSize: 13 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  priorityText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  modalMessage: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
  detailsContainer: { borderRadius: 8, padding: 12, marginTop: 6 },
  detailsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  detailsText: { fontSize: 14, lineHeight: 20 },
  modalFooter: { padding: 16, borderTopWidth: 1 },
  actionButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default AlertsScreen;
