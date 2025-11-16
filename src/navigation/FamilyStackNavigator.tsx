import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ShareIdScreen from '../screens/family/ShareIdScreen';
import AddFamilyKeyScreen from '../screens/family/AddFamilyKeyScreen';
import { FamilyStackParamList } from './types';

const Stack = createStackNavigator<FamilyStackParamList>();

const FamilyStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen 
        name="ShareId" 
        component={ShareIdScreen} 
        options={{ title: 'Share ID' }}
      />
      <Stack.Screen 
        name="AddFamilyKey" 
        component={AddFamilyKeyScreen}
        options={{ title: 'Add Family Member' }}
      />
    </Stack.Navigator>
  );
};

export default FamilyStackNavigator;
