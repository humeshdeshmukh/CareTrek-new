import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/theme/ThemeContext';
import ShareIdScreen from '../screens/family/ShareIdScreen';
import AddFamilyKeyScreen from '../screens/family/AddFamilyKeyScreen';

export type FamilyKeyStackParamList = {
  ShareId: undefined;
  AddFamilyKey: undefined;
};

const Stack = createStackNavigator<FamilyKeyStackParamList>();

const FamilyKeyStackNavigator = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="ShareId" 
        component={ShareIdScreen}
        options={{ title: 'Share Your ID' }}
      />
      <Stack.Screen 
        name="AddFamilyKey" 
        component={AddFamilyKeyScreen}
        options={{ title: 'Add Family Member' }}
      />
    </Stack.Navigator>
  );
};

export default FamilyKeyStackNavigator;
