import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme } from '../contexts/theme/ThemeContext';
import { useTranslation } from '../contexts/translation/TranslationContext';
import { useCachedTranslation } from '../hooks/useCachedTranslation';

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { isDark } = useTheme();
  const { currentLanguage } = useTranslation();
  
  // Use the translation hook for each text element
  const { translatedText: welcomeTitle } = useCachedTranslation('Welcome to CareTrek', currentLanguage);
  const { translatedText: welcomeSubtitle } = useCachedTranslation('Your trusted companion for senior care and family connection', currentLanguage);
  const { translatedText: welcomeTagline } = useCachedTranslation('Bridging generations with care and technology', currentLanguage);
  const { translatedText: getStartedText } = useCachedTranslation('Get Started', currentLanguage);
  const { translatedText: changeLanguageText } = useCachedTranslation('Change Language', currentLanguage);
  
  const welcomeImage: ImageSourcePropType = require('../../assets/ChatGPT Image Nov 6, 2025, 07_19_20 PM.png');
  
  const handleGetStarted = () => {
    navigation.navigate('RoleSelection');
  };
  
  const handleLanguageSelect = () => {
    navigation.navigate('Language');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#171923' : '#FFFBEF' }]}>
      <View style={styles.content}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: isDark ? '#48BB78' : '#2F855A' }]}>
            CareTrek
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.illustrationContainer}>
            <View style={[styles.imageWrapper, isDark && styles.imageWrapperDark]}>
              <View style={[styles.imageBackground, isDark && styles.imageBackgroundDark]}>
                <Image 
                  source={welcomeImage} 
                  style={styles.illustration}
                  resizeMode="contain"
                  onError={(error) => console.log('Image load error:', error.nativeEvent.error)}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
              {welcomeTitle}
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {welcomeSubtitle}
            </Text>
            <Text style={[styles.tagline, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              {welcomeTagline}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, { backgroundColor: isDark ? '#48BB78' : '#2F855A' }]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: 'white' }]}>
              {getStartedText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, { borderColor: isDark ? '#48BB78' : '#2F855A' }]}
            onPress={handleLanguageSelect}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: isDark ? '#48BB78' : '#2F855A' }]}>
              {changeLanguageText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imageWrapper: {
    width: '100%',
    maxWidth: 400,
    height: 300,
    borderRadius: 16,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
    overflow: 'hidden',
    borderWidth: 0,
  },
  imageWrapperDark: {
    backgroundColor: '#2D3748',
    shadowColor: '#000',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  illustration: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  textContainer: {
    marginBottom: 40,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 26,
    fontWeight: '500',
  },
  tagline: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 'auto',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primaryButton: {
    shadowColor: '#2F855A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  // Back button styles
  backButton: {
    position: 'absolute',
    top: 8,
    left: 16,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
  },
  imageBackground: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  imageBackgroundDark: {
    backgroundColor: 'transparent',
  },
});
