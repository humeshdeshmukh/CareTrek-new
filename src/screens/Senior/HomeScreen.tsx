import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { TabParamList } from '../../navigation/SeniorTabs';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/translation/TranslationContext';
import { useCachedTranslation } from '../../hooks/useCachedTranslation';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { isDark } = useTheme();
  const { currentLanguage } = useTranslation();

  // Translations
  // Translations
  const { translatedText: welcomeText } = useCachedTranslation('Welcome back', currentLanguage);
  const { translatedText: healthText } = useCachedTranslation('Health', currentLanguage) || 'Health';
  const { translatedText: remindersText } = useCachedTranslation('Reminders', currentLanguage) || 'Reminders';
  const { translatedText: mapText } = useCachedTranslation('Map', currentLanguage) || 'Map';
  const { translatedText: idShareText } = useCachedTranslation('ID Share', currentLanguage) || 'ID Share';
  const { translatedText: sosText } = useCachedTranslation('SOS', currentLanguage) || 'SOS';
  const { translatedText: sosContactsText } = useCachedTranslation('SOS Contacts', currentLanguage) || 'SOS Contacts';
  const { translatedText: quickActionsText } = useCachedTranslation('Quick Actions', currentLanguage) || 'Quick Actions';
  const { translatedText: medicationText } = useCachedTranslation('Medication', currentLanguage) || 'Medication';
  const { translatedText: appointmentsText } = useCachedTranslation('Appointments', currentLanguage) || 'Appointments';
  const { translatedText: profileText } = useCachedTranslation('Profile', currentLanguage) || 'Profile';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#2F855A' : '#2F855A' }]}>
            {welcomeText},
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#A0AEC0' : '#4A5568' }]}>
            How can we help you today?
          </Text>
        </View>

        {/* SOS Button */}
        <TouchableOpacity
          style={[styles.sosButton, { backgroundColor: isDark ? '#E53E3E' : '#F56565' }]}
          onPress={() => navigation.navigate('SOSContacts')}
        >
          <Ionicons name="alert-circle" size={40} color="white" />
          <Text style={styles.sosButtonText}>{sosText}</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#2F855A' : '#2F855A' }]}>
            {quickActionsText}
          </Text>
          <View style={styles.quickActionsGrid}>
            {/* Health */}
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
              onPress={() => tabNavigation.navigate('Health')}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#E53E3E' : '#FED7D7' }]}>
                <Ionicons name="heart" size={24} color={isDark ? '#FFFFFF' : '#E53E3E'} />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
                {healthText}
              </Text>
            </TouchableOpacity>

            {/* Medication */}
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
              onPress={() => tabNavigation.navigate('Medication')}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2F855A' : '#E6FFFA' }]}>
                <Ionicons name="medkit" size={24} color={isDark ? '#FFFFFF' : '#2F855A'} />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
                {medicationText}
              </Text>
            </TouchableOpacity>

            {/* Appointments */}
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
              onPress={() => tabNavigation.navigate('Appointments')}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#D69E2E' : '#FFFAF0' }]}>
                <Ionicons name="calendar" size={24} color={isDark ? '#FFFFFF' : '#D69E2E'} />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
                {appointmentsText}
              </Text>
            </TouchableOpacity>

{/* Reminders */}
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
              onPress={() => tabNavigation.navigate('Reminders')}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#805AD5' : '#FAF5FF' }]}>
                <Ionicons name="notifications" size={24} color={isDark ? '#FFFFFF' : '#805AD5'} />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
                {remindersText}
              </Text>
            </TouchableOpacity>

            {/* Map */}
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
              onPress={() => tabNavigation.navigate('Map')}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2C5282' : '#EBF8FF' }]}>
                <Ionicons name="map" size={24} color={isDark ? '#FFFFFF' : '#2C5282'} />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
                {mapText}
              </Text>
            </TouchableOpacity>

            {/* ID Share */}
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
              onPress={() => navigation.navigate('IdShareScreen')}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2C5282' : '#EBF8FF' }]}>
                <Ionicons name="share-social" size={24} color={isDark ? '#FFFFFF' : '#2C5282'} />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
                {idShareText}
              </Text>
            </TouchableOpacity>

            {/* Profile
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
              onPress={() => tabNavigation.navigate('Profile')}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#4A5568' : '#F7FAFC' }]}>
                <Ionicons name="person" size={24} color={isDark ? '#FFFFFF' : '#4A5568'} />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
                {profileText}
              </Text>
            </TouchableOpacity> */}

            {/* <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}
              onPress={() => navigation.navigate('HealthDashboard')}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#805AD5' : '#FAF5FF' }]}>
                <Ionicons name="medical" size={24} color={isDark ? '#FFFFFF' : '#805AD5'} />
              </View>
              <Text style={[styles.quickActionText, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
                {healthText}
              </Text>
            </TouchableOpacity> */}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2F855A',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#2F855A',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  sosButton: {
    width: '100%',
    paddingVertical: 24,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  sosButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});

export default HomeScreen;
