// src/utils/push.ts
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function safeRegisterForPushAsync() {
  // Skip in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo' || Constants.appOwnership === 'guest';
  if (isExpoGo) {
    console.log('Expo Go detected - skipping push registration (use dev build for push)');
    return null;
  }

  try {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get notification permissions');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push token:', token);
      return token;
    }
    return null;
  } catch (e) {
    console.warn('Push registration failed (safe):', e);
    return null;
  }
}