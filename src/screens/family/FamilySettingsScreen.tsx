import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  Image
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useDispatch } from 'react-redux';
import { setUser, clearError } from '../../store/slices/authSlice';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useTranslation } from '../../contexts/translation/TranslationContext';
import { useCachedTranslation } from '../../hooks/useCachedTranslation';
import { useAuth } from '../../hooks/useAuth';

import { FamilyStackParamList } from '../../navigation/FamilyNavigator';

type SettingsStackParamList = {
  EditProfile: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  HelpCenter: undefined;
  ContactSupport: undefined;
  // Add Auth stack for logout
  Auth: undefined;
};

const FamilySettingsScreen = () => {
  const navigation = useNavigation<StackNavigationProp<SettingsStackParamList>>();
  const { isDark, toggleTheme, colors } = useTheme();
  const { currentLanguage } = useTranslation();
  const { user: authUser, signOut } = useAuth();
  
  const [darkMode, setDarkMode] = useState(isDark);
  
  // Get user data from Redux store with fallbacks
  const user = {
    name: authUser?.displayName || authUser?.email?.split('@')[0] || 'User',
    email: authUser?.email || 'No email available',
    // Use avatar if available, otherwise use a default avatar
    avatar: authUser?.photoURL || undefined,
  };

  // Translations
  const { translatedText: settingsText } = useCachedTranslation('Settings', currentLanguage);
  const { translatedText: accountText } = useCachedTranslation('Account', currentLanguage);
  const { translatedText: editProfileText } = useCachedTranslation('Edit Profile', currentLanguage);
  const { translatedText: preferencesText } = useCachedTranslation('Preferences', currentLanguage);
  const { translatedText: darkModeText } = useCachedTranslation('Dark Mode', currentLanguage);
  const { translatedText: supportText } = useCachedTranslation('Support', currentLanguage);
  const { translatedText: helpCenterText } = useCachedTranslation('Help Center', currentLanguage);
  const { translatedText: contactSupportText } = useCachedTranslation('Contact Support', currentLanguage);
  const { translatedText: aboutText } = useCachedTranslation('About', currentLanguage);
  const { translatedText: privacyPolicyText } = useCachedTranslation('Privacy Policy', currentLanguage);
  const { translatedText: termsOfServiceText } = useCachedTranslation('Terms of Service', currentLanguage);
  const { translatedText: versionText } = useCachedTranslation('Version', currentLanguage);
  const { translatedText: signOutText } = useCachedTranslation('Sign Out', currentLanguage);
  const { translatedText: signOutConfirmationText } = useCachedTranslation('Are you sure you want to sign out?', currentLanguage);
  const { translatedText: cancelText } = useCachedTranslation('Cancel', currentLanguage);
  const { translatedText: confirmText } = useCachedTranslation('Confirm', currentLanguage);

    const dispatch = useDispatch();

  const handleSignOut = async () => {
    try {
      // Call the signOut function from useAuth hook
      await signOut();
      
      // Clear user data from Redux (this might be redundant as the auth slice should handle this)
      dispatch(setUser(null));
      dispatch(clearError());
      
      // Navigate to RoleSelection screen
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'RoleSelection' }],
        })
      );
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, we'll still try to reset the auth state and navigation
      dispatch(setUser(null));
      dispatch(clearError());
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'RoleSelection' }],
        })
      );
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      signOutText,
      signOutConfirmationText,
      [
        {
          text: cancelText,
          style: 'cancel',
        },
        {
          text: confirmText,
          onPress: handleSignOut,
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const openLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const openEmail = (email: string) => {
    Linking.openURL(`mailto:${email}?subject=CareTrek Support`);
  };

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    toggleTheme();
  };

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, { color: isDark ? '#A0AEC0' : '#718096' }]}>
      {title}
    </Text>
  );

  const renderSettingItem = ({
    icon,
    label,
    onPress,
    isSwitch = false,
    switchValue,
    onSwitchValueChange,
    showChevron = true,
    isLast = false,
  }: {
    icon: string;
    label: string;
    onPress?: () => void;
    isSwitch?: boolean;
    switchValue?: boolean;
    onSwitchValueChange?: (value: boolean) => void;
    showChevron?: boolean;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? '#2D3748' : '#E2E8F0' },
      ]}
      onPress={onPress}
      disabled={isSwitch}
    >
      <View style={styles.settingLeft}>
        <MaterialIcons 
          name={icon as any} 
          size={24} 
          color={isDark ? '#E2E8F0' : '#4A5568'} 
          style={styles.settingIcon}
        />
        <Text style={[styles.settingLabel, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
          {label}
        </Text>
      </View>
      
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchValueChange}
          trackColor={{ false: isDark ? '#4A5568' : '#E2E8F0', true: isDark ? '#48BB78' : '#38A169' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={isDark ? '#4A5568' : '#E2E8F0'}
        />
      ) : showChevron ? (
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={isDark ? '#A0AEC0' : '#718096'} 
        />
      ) : null}
    </TouchableOpacity>
  );

  // Get user initials for avatar fallback
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1A202C' : '#F7FAFC' }]}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
          {renderSectionHeader(accountText)}
          
          <TouchableOpacity 
            style={styles.profileContainer}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.avatarContainer}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#4A5568' : '#E2E8F0' }]} >
                  <Text style={[styles.avatarText, { color: isDark ? '#E2E8F0' : '#4A5568' }]} >
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: isDark ? '#E2E8F0' : '#1A202C' }]} >
                {user.name}
              </Text>
              <Text style={[styles.profileEmail, { color: isDark ? '#A0AEC0' : '#718096' }]} >
                {user.email}
              </Text>
            </View>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={isDark ? '#A0AEC0' : '#718096'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons 
                name="edit" 
                size={24} 
                color={isDark ? '#E2E8F0' : '#4A5568'} 
                style={styles.settingIcon}
              />
              <Text style={[styles.settingLabel, { color: isDark ? '#E2E8F0' : '#1A202C' }]} >
                {editProfileText}
              </Text>
            </View>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={isDark ? '#A0AEC0' : '#718096'} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Preferences Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF', marginTop: 16 }]} >
          {renderSectionHeader(preferencesText)}
          
          {renderSettingItem({
            icon: 'dark-mode',
            label: darkModeText,
            isSwitch: true,
            switchValue: darkMode,
            onSwitchValueChange: toggleDarkMode,
            isLast: true
          })}
        </View>
        
        {/* Support Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF', marginTop: 16 }]} >
          {renderSectionHeader(supportText)}
          
          {renderSettingItem({
            icon: 'email',
            label: contactSupportText,
            onPress: () => openEmail('support@caretrek.app'),
          })}
          {renderSettingItem({
            icon: 'privacy-tip',
            label: privacyPolicyText,
            onPress: () => navigation.navigate('PrivacyPolicy'),
          })}
          {renderSettingItem({
            icon: 'description',
            label: termsOfServiceText,
            onPress: () => navigation.navigate('TermsOfService'),
            isLast: true
          })}
        </View>
        
        {/* Version */}
        <View style={styles.versionContainer} >
          <Text style={[styles.versionText, { color: isDark ? '#A0AEC0' : '#718096' }]} >
            {versionText} 1.0.0
          </Text>
        </View>
        
        {/* Sign Out Button */}
        <TouchableOpacity 
          onPress={confirmSignOut}
          style={[styles.signOutButton, { 
            backgroundColor: isDark ? '#E53E3E' : '#FED7D7',
            borderTopWidth: 1,
            borderTopColor: isDark ? '#4A5568' : '#E2E8F0',
            marginTop: 20,
          }]}
        >
          <View style={styles.signOutContent} >
            <MaterialIcons 
              name="logout" 
              size={24} 
              color="#E53E3E" 
              style={styles.signOutIcon} 
            />
            <Text style={[styles.signOutText, { color: '#E53E3E' }]} >
              {signOutText || 'Sign Out'}
            </Text>
          </View>
          <MaterialIcons 
            name="chevron-right" 
            size={24} 
            color="#A0AEC0" 
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A5568',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#718096',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1A202C',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  signOutButton: {
    margin: 16,
    backgroundColor: '#FED7D7',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  signOutIcon: {
    marginRight: 8,
    color: '#E53E3E',
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutText: {
    color: '#E53E3E',
    fontWeight: '600',
    fontSize: 16,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
    borderColor: '#4F46E5',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContainer: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1A202C',
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutIcon: {
    marginRight: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
  },
  versionContainer: {
    padding: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#718096',
  },
  signOutButton: {
    marginTop: 8,
    marginBottom: 32,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53E3E',
  },
  signOutButton: {
    marginTop: 8,
    marginBottom: 32,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53E3E',
  },
});

export default FamilySettingsScreen;
