import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const { signInAsGuest, loading } = useAuth();

  const handleGuestSignIn = async () => {
    try {
      await signInAsGuest();
      // Navigation to the main app will be handled by the auth state change
    } catch (error) {
      console.error('Guest sign in failed:', error);
      // Handle error (show alert, etc.)
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to CareTrek</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.guestButton]} 
          onPress={handleGuestSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue as Guest</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Guest mode allows you to explore the app. Some features may be limited.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  guestButton: {
    backgroundColor: '#4a90e2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});
