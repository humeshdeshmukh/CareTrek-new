import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/theme/ThemeContext';

export default function GuestHomeScreen() {
  const { signOut } = useAuth();
  const { isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
      <Text style={[styles.title, { color: isDark ? '#F7FAFC' : '#1A202C' }]}>
        Welcome, Guest!
      </Text>
      <Text style={[styles.subtitle, { color: isDark ? '#A0AEC0' : '#4A5568' }]}>
        You're currently using CareTrek in guest mode.
      </Text>
      
      <View style={styles.featuresContainer}>
        <Text style={[styles.feature, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
          • View basic features
        </Text>
        <Text style={[styles.feature, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
          • Explore the app
        </Text>
        <Text style={[styles.feature, { color: isDark ? '#E2E8F0' : '#2D3748' }]}>
          • Limited functionality
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: isDark ? '#48BB78' : '#2F855A' }]}
        onPress={signOut}
      >
        <Text style={styles.buttonText}>Sign Up for Full Access</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut}>
        <Text style={[styles.signOutText, { color: isDark ? '#4299E1' : '#2B6CB0' }]}>
          Switch to Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: 30,
    width: '80%',
  },
  feature: {
    fontSize: 16,
    marginVertical: 8,
  },
  button: {
    width: '80%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
