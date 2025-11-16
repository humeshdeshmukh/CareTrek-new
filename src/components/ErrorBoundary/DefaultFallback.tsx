import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface DefaultFallbackProps {
  error: Error;
  resetError: () => void;
}

const DefaultFallback: React.FC<DefaultFallbackProps> = ({ error, resetError }) => (
  <View style={styles.container}>
    <Text style={styles.title}>Something went wrong</Text>
    <Text style={styles.errorText}>{error.message}</Text>
    <TouchableOpacity style={styles.button} onPress={resetError}>
      <Text style={styles.buttonText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ff3b30',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DefaultFallback;
