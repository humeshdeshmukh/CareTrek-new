import { StyleSheet } from 'react-native';

export const themeStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  
  // Button styles
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: '#2F855A',
  },
  buttonAccent: {
    backgroundColor: '#E2B97C',
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: '#2F855A',
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  buttonOutlineText: {
    color: '#2F855A',
  },
  
  // Input styles
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  
  // Card styles
  card: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Text styles
  text: {
    fontFamily: 'Inter_400Regular',
    color: '#1A202C',
  },
  textDark: {
    color: '#F7FAFC',
  },
  textMuted: {
    color: '#718096',
  },
  textPrimary: {
    color: '#2F855A',
  },
  heading1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 12,
  },
  heading2: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 10,
  },
  heading3: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Utility styles
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  shadowLg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
});

// Dark theme overrides
export const darkThemeOverrides = {
  buttonPrimary: {
    backgroundColor: '#48BB78',
  },
  buttonAccent: {
    backgroundColor: '#E2B97C',
  },
  buttonOutline: {
    borderColor: '#48BB78',
  },
  buttonOutlineText: {
    color: '#48BB78',
  },
  input: {
    backgroundColor: '#2D3748',
    borderColor: '#4A5568',
    color: '#F7FAFC',
  },
  card: {
    backgroundColor: '#2D3748',
  },
  text: {
    color: '#F7FAFC',
  },
  textMuted: {
    color: '#CBD5E0',
  },
};
