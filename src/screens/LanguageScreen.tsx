import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme } from '../contexts/theme/ThemeContext';
import { useTranslation } from '../contexts/translation/TranslationContext';
import { getAvailableLanguages, LanguageCode } from '../services/TranslationService';

type LanguageScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Language'>;

// Get available languages from the service
const languages = getAvailableLanguages();

const LanguageScreen = () => {
  const navigation = useNavigation<LanguageScreenNavigationProp>();
  const { currentLanguage, setLanguage, isTranslating } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(currentLanguage);
  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const { width } = Dimensions.get('window');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleBack = () => {
    // Navigate to Welcome screen instead of going back
    navigation.navigate('Welcome');
  };

  const handleLanguageSelect = (languageCode: LanguageCode) => {
    setSelectedLanguage(languageCode);
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await setLanguage(selectedLanguage);
      // Navigate to Onboarding screen after language selection
      navigation.navigate('Onboarding');
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedLanguage(currentLanguage);
  }, [currentLanguage]);

  const getText = (key: string) => {
    const texts: Record<string, string> = {
      'selectLanguage': 'Select Language',
      'continue': 'Continue',
      'languageChanged': 'Language changed successfully',
      'errorChangingLanguage': 'Error changing language',
    };
    return texts[key] || key;
  };

  const bgColor = isDark ? '#171923' : '#FFFBEF';
  const textColor = isDark ? '#E2E8F0' : '#2D3748';
  const cardBg = isDark ? '#2D3748' : '#FFFFFF';
  const primaryColor = isDark ? '#48BB78' : '#2F855A';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Animated.View 
        style={[
          styles.header,
          { 
            opacity: fadeAnim,
            transform: [{ translateY }],
          }
        ]}
      >
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M5 12L12 19M5 12L12 5" 
                  stroke={textColor} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1A202C' }]}>
          {getText('selectLanguage')}
        </Text>
      </Animated.View>
      <Animated.View 
        style={[
          styles.content,
          { 
            opacity: fadeAnim,
            transform: [{ translateY }],
          }
        ]}
      >
        <Text style={[styles.subtitle, { color: textColor, marginBottom: 20 }]}>
          Select Your Language
        </Text>
        <ScrollView style={styles.languageList}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageItem,
                { 
                  backgroundColor: cardBg,
                  borderColor: selectedLanguage === lang.code ? primaryColor : 'transparent',
                  borderWidth: 2,
                }
              ]}
              onPress={() => setSelectedLanguage(lang.code)}
            >
              <Text style={[
                styles.languageName, 
                { 
                  color: isDark ? '#E2E8F0' : '#4A5568',
                  fontWeight: selectedLanguage === lang.code ? 'bold' : 'normal'
                }
              ]}>
                {lang.nativeName} ({lang.name})
              </Text>
              {selectedLanguage === lang.code && (
                <View style={[styles.selectedIndicator, { backgroundColor: primaryColor }]} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: isDark ? '#2F855A' : '#38A169' }]}
        onPress={handleContinue}
        disabled={isLoading}
      >
        <Text style={styles.continueButtonText}>
          {getContinueButtonText(selectedLanguage)}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const getContinueButtonText = (langCode: string) => {
  switch (langCode) {
    case 'ta': return 'தொடரவும்';
    case 'gu': return 'ચાલુ રાખો';
    case 'kn': return 'ಮುಂದುವರಿಸಿ';
    case 'ml': return 'തുടരുക';
    case 'pa': return 'ਜਾਰੀ ਰੱਖੋ';
    case 'hi': return 'जारी रखें';
    case 'bn': return 'চালিয়ে যান';
    case 'te': return 'కొనసాగించు';
    case 'mr': return 'सुरू ठेवा';
    default: return 'Continue';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    opacity: 0.8,
  },
  languageList: {
    flex: 1,
    marginBottom: 20,
  },
  languageItem: {
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 10,
  },
  continueButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    marginHorizontal: 20,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
});

export default LanguageScreen;
