import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/theme/ThemeContext';
import GuestHomeScreen from '../screens/guest/GuestHomeScreen';

export type GuestStackParamList = {
  GuestHome: undefined;
  // Add other guest screens here
};

const Stack = createStackNavigator<GuestStackParamList>();

export const GuestNavigator = () => {
  const { isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: isDark ? '#171923' : '#FFFBEF' },
      }}
      initialRouteName="GuestHome"
    >
      <Stack.Screen name="GuestHome" component={GuestHomeScreen} />
      {/* Add other guest screens here */}
    </Stack.Navigator>
  );
};
