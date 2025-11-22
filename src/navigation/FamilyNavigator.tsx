// FamilyNavigator.tsx - Central navigation for the Family app
import React from 'react';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { NavigationContainerRef, useNavigationContainerRef, useNavigation, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, View, Text, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Screens
import HomeScreenFamily from '../screens/family/HomeScreenFamily';
import SeniorsListScreen from '../screens/family/SeniorsListScreen';
import SeniorDetailScreen from '../screens/family/SeniorDetailScreen';
import FamilySettingsScreen from '../screens/family/FamilySettingsScreen';
import AddSeniorScreen from '../screens/family/AddSeniorScreen';
import EditProfileScreen from '../screens/Senior/EditProfileScreen';
import { SeniorDataProvider } from '../contexts/SeniorDataContext';
import PrivacyPolicyScreen from '../screens/family/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/family/TermsOfServiceScreen';
import HealthMonitoringScreen from '../screens/family/monitoring/HealthMonitoringScreen';
import MedicationMonitoringScreen from '../screens/family/monitoring/MedicationMonitoringScreen';
import AppointmentMonitoringScreen from '../screens/family/monitoring/AppointmentMonitoringScreen';
import LocationMonitoringScreen from '../screens/family/monitoring/LocationMonitoringScreen';
import ReminderMonitoringScreen from '../screens/family/monitoring/ReminderMonitoringScreen';
import SeniorNotesScreen from '../screens/family/monitoring/SeniorNotesScreen';
import AlertsScreen from '../screens/family/AlertsScreen';

// Tab navigation param list
type FamilyTabParamList = {
  HomeTab: undefined;
  HealthTab: undefined;
  LocationTab: undefined;
  Seniors: { refresh?: boolean };
  Settings: undefined;
};

// Stack navigation param list
export type FamilyStackParamList = {
  MainTabs: undefined;
  SeniorDetail: { seniorId: string };
  AddSenior: undefined;
  // Settings
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  // Monitoring screens
  HealthMonitoring: { seniorId?: string; seniorName?: string };
  MedicationMonitoring: { seniorId: string; seniorName: string };
  AppointmentMonitoring: { seniorId: string; seniorName: string };
  LocationMonitoring: { seniorId?: string; seniorName?: string };
  ReminderMonitoring: { seniorId: string; seniorName: string };
  SeniorNotes: undefined;
  // Alerts
  Alerts: undefined;
};

const Tab = createBottomTabNavigator<FamilyTabParamList>();
const Stack = createStackNavigator<FamilyStackParamList>();
const cardStyleInterpolator = CardStyleInterpolators.forHorizontalIOS;
export const navigationRef = React.createRef<NavigationContainerRef<FamilyStackParamList>>();
export function navigate(name: keyof FamilyStackParamList, params?: any) {
  if (navigationRef.current?.isReady()) {
    navigationRef.current.navigate(name as any, params);
  } else {
    console.warn('Navigation reference is not ready yet');
  }
}

// Custom tab bar button for visual feedback
const TabBarButton: React.FC<BottomTabBarButtonProps> = ({ children, onPress, accessibilityState, ...props }) => {
  const isFocused = accessibilityState?.selected;
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isFocused ? `${colors.primary}33` : 'transparent',
        margin: 4,
        borderRadius: 8,
      }}
      activeOpacity={0.8}
      {...(props as any)}
    >
      {children}
    </TouchableOpacity>
  );
};

// Placeholder component for tabs that navigate to stack screens
const PlaceholderComponent = () => null;

// Bottom Tab Navigator
const TabNavigator: React.FC = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarButton: (props) => <TabBarButton {...props} />, // custom button
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'HealthTab') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'LocationTab') iconName = focused ? 'location' : 'location-outline';
          else if (route.name === 'Seniors') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: isDark ? '#48BB78' : '#2F855A',
        tabBarInactiveTintColor: isDark ? '#A0AEC0' : '#718096',
        tabBarStyle: {
          backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
          borderTopColor: isDark ? '#2D3748' : '#E2E8F0',
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        },
        tabBarLabelStyle: { fontSize: 10, marginBottom: 5 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreenFamily} options={{ title: t('Home') || 'Home' }} />
      <Tab.Screen
        name="HealthTab"
        component={PlaceholderComponent}
        options={{ title: t('Health') || 'Health' }}
        listeners={{
          tabPress: (e) => {
            // Prevent default action
            e.preventDefault();
            // Navigate to the stack screen
            navigation.navigate('HealthMonitoring');
          },
        }}
      />
      <Tab.Screen
        name="LocationTab"
        component={PlaceholderComponent}
        options={{ title: t('Location') || 'Location' }}
        listeners={{
          tabPress: (e) => {
            // Prevent default action
            e.preventDefault();
            // Navigate to the stack screen
            navigation.navigate('LocationMonitoring');
          },
        }}
      />
      <Tab.Screen name="Seniors" component={SeniorsListScreen} options={{ title: t('Seniors') || 'Seniors' }} />
      <Tab.Screen name="Settings" component={FamilySettingsScreen} options={{ title: t('Settings') || 'Settings' }} />
    </Tab.Navigator>
  );
};

// Stack Navigator for the whole app
export const FamilyNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? '#1A202C' : '#FFFFFF', elevation: 0, shadowOpacity: 0 },
        headerTintColor: isDark ? '#E2E8F0' : '#1A202C',
        headerTitleStyle: { fontWeight: '600' },
        cardStyle: { backgroundColor: isDark ? '#1A202C' : '#F7FAFC' },
        cardStyleInterpolator,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="SeniorDetail"
        options={{ headerShown: true, title: t('Senior Details') || 'Senior Details' }}
      >
        {() => (
          <SeniorDataProvider>
            <SeniorDetailScreen />
          </SeniorDataProvider>
        )}
      </Stack.Screen>
      <Stack.Screen name="AddSenior" component={AddSeniorScreen} options={{ title: t('Add Senior') || 'Add Senior', headerShown: true }} />
      <Stack.Screen name="HealthMonitoring" component={HealthMonitoringScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MedicationMonitoring" component={MedicationMonitoringScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AppointmentMonitoring" component={AppointmentMonitoringScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LocationMonitoring" component={LocationMonitoringScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ReminderMonitoring" component={ReminderMonitoringScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SeniorNotes" component={SeniorNotesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: t('Alerts') || 'Alerts', headerShown: true }} />
      <Stack.Screen name="Settings" component={FamilySettingsScreen} options={{ title: t('Settings') || 'Settings', headerShown: true }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: t('Edit Profile') || 'Edit Profile', headerShown: true }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: t('Privacy Policy') || 'Privacy Policy', headerShown: true }} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: t('Terms of Service') || 'Terms of Service', headerShown: true }} />
    </Stack.Navigator>
  );
};

export default FamilyNavigator;
