import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/theme/ThemeContext';

interface ShareIdButtonProps {
  onPress: () => void;
}

const ShareIdButton: React.FC<ShareIdButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={onPress}
    >
      <View style={styles.buttonContent}>
        <Ionicons name="person-add" size={24} color="white" />
        <Text style={styles.buttonText}>Share Your ID</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default ShareIdButton;
