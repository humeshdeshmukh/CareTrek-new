import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/theme/ThemeContext';
import { SeniorStackParamList } from '../types/navigation';

export type TabParamList = {
  Home: undefined;
  Medication: undefined;
  Reminders: undefined;
  Profile: undefined;
};

// Import screens
import HomeScreen from '../screens/Senior/HomeScreen';
import RemindersScreen from '../screens/Senior/RemindersScreen';
import ProfileScreen from '../screens/Senior/ProfileScreen';
import MedicationScreen from '../screens/Senior/MedicationScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export const SeniorTabs = () => {
  const { isDark } = useTheme();

  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          switch (route.name) {
            case 'Home':
              return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
            case 'Medication':
              return <Ionicons name={focused ? 'medkit' : 'medkit-outline'} size={size} color={color} />;
            case 'Reminders':
              return <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} />;
            case 'Profile':
              return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />;
            default:
              return <Ionicons name="help" size={size} color={color} />;
          }
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 12, marginBottom: 4 },
        tabBarItemStyle: { padding: 4 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: 'Home',
          headerShown: false
        }} 
      />
      <Tab.Screen 
        name="Medication" 
        component={MedicationScreen} 
        options={{ 
          title: 'Meds',
          headerShown: false
        }} 
      />
      <Tab.Screen 
        name="Reminders" 
        component={RemindersScreen} 
        options={{ 
          title: 'Reminders',
          headerShown: false
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          headerShown: false
        }} 
      />
    </Tab.Navigator>
  );
};
