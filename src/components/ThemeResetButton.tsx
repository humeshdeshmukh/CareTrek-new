import React from 'react';
import { Button, Alert } from 'react-native';
import { resetThemeToLight } from '../utils/themeUtils';

export const ThemeResetButton = () => {
  const handleResetTheme = () => {
    Alert.alert(
      'Reset Theme',
      'Are you sure you want to reset the theme to light mode?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          onPress: resetThemeToLight,
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Button
      title="Reset to Light Theme"
      onPress={handleResetTheme}
      color="#FF3B30" // Red color for destructive action
    />
  );
};
