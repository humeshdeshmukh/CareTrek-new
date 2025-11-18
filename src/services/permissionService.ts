// src/services/permissionService.ts
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSIONS_REQUESTED_KEY = 'permissions_requested';

export const permissionService = {
  /**
   * Request all necessary permissions on app startup
   * This ensures permissions are granted before user tries to use features
   */
  async requestAllPermissions(): Promise<void> {
    if (Platform.OS !== 'android') {
      return; // iOS handles permissions differently
    }

    try {
      // Check if we've already requested permissions in this session
      const alreadyRequested = await AsyncStorage.getItem(PERMISSIONS_REQUESTED_KEY);
      if (alreadyRequested === 'true') {
        return; // Already requested in this session
      }

      // Request Activity Recognition permission (for step tracking)
      await this.requestActivityRecognitionPermission();

      // Mark that we've requested permissions
      await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
    } catch (error) {
      console.warn('Error requesting permissions:', error);
    }
  },

  /**
   * Request Activity Recognition permission specifically
   * Used for step tracking from smartwatch
   */
  async requestActivityRecognitionPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need this permission
    }

    if (Platform.Version < 29) {
      return true; // Android < 10 doesn't need this permission
    }

    try {
      // Check if already granted
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
      );

      if (alreadyGranted) {
        console.log('Activity Recognition permission already granted');
        return true;
      }

      // Request the permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: '📊 Activity Recognition Permission',
          message: 'CareTrek needs permission to track your steps from your smartwatch.\n\nThis allows us to:\n• Sync step data from your watch\n• Track daily activity\n• Show accurate health metrics',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Not Now',
          buttonPositive: 'Allow',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Activity Recognition permission granted');
        return true;
      } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        console.log('Activity Recognition permission permanently denied');
        return false;
      } else {
        console.log('Activity Recognition permission denied');
        return false;
      }
    } catch (error) {
      console.warn('Error requesting Activity Recognition permission:', error);
      return false;
    }
  },

  /**
   * Check if Activity Recognition permission is granted
   */
  async isActivityRecognitionGranted(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    if (Platform.Version < 29) {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
      );
      return granted;
    } catch (error) {
      console.warn('Error checking Activity Recognition permission:', error);
      return false;
    }
  },

  /**
   * Show alert if permission is needed but not granted
   */
  async showPermissionAlert(featureName: string = 'this feature'): Promise<void> {
    const isGranted = await this.isActivityRecognitionGranted();

    if (!isGranted) {
      Alert.alert(
        '⚠️ Permission Required',
        `Activity Recognition permission is required to use ${featureName}.\n\nPlease grant the permission when prompted.`,
        [
          {
            text: 'Request Permission',
            onPress: () => this.requestActivityRecognitionPermission(),
            style: 'default',
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  },

  /**
   * Reset permissions requested flag (for testing)
   */
  async resetPermissionsFlag(): Promise<void> {
    await AsyncStorage.removeItem(PERMISSIONS_REQUESTED_KEY);
  },
};
