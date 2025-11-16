import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  SafeAreaView,
  Dimensions
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

type ProfileItem = {
  icon: string;
  label: string;
  value: string;
  copyable?: boolean;
  action: () => void;
};

const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation<any>();
  
  // Set custom header options
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'My Profile',
      headerTitleAlign: 'center',
      headerStyle: {
        backgroundColor: colors.primary,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
      },
    });
  }, [navigation, colors.primary]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Replace with real refresh logic if needed
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard', error);
      Alert.alert('Error', 'Failed to copy to clipboard.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              setIsLoading(true);
              await signOut();
              // Navigate to WelcomeScreen and reset the navigation stack
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };


  const profileItems: ProfileItem[] = [
    {
      icon: 'account-circle',
      label: 'Full Name',
      value: user?.displayName || 'Not set',
      action: () => navigation.navigate('Auth', { screen: 'EditProfile' }),
    },
    {
      icon: 'email-outline',
      label: 'Email Address',
      value: user?.email || 'Not set',
      action: () => {},
    },
    {
      icon: 'phone-outline',
      label: 'Phone Number',
      value: (user as any)?.phoneNumber || 'Not provided',
      action: () => {},
    },
    {
      icon: 'account-tie',
      label: 'Account Type',
      value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Senior',
      action: () => {},
    },
    {
      icon: 'identifier',
      label: 'User ID',
      value: user?.id || 'Not available',
      copyable: true,
      action: () => copyToClipboard(user?.id || ''),
    }
  ];

  const renderProfileHeader = () => (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark || colors.primary]}
      style={styles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.headerContent}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Icon name="account-circle" size={80} color="#fff" />
          </View>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            onPress={() => navigation.navigate('Auth', { screen: 'EditProfile' })}
          >
            <Icon name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {user?.displayName || 'User'}
          </Text>
          <Text style={styles.email} numberOfLines={1} ellipsizeMode="tail">
            {user?.email || ''}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderProfileInfo = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Personal Information</Text>

      {profileItems.map((item, index) => (
        <TouchableOpacity
          key={item.label}
          style={styles.detailItem}
          onPress={item.action}
          activeOpacity={0.7}
        >
          <View style={styles.detailContent}>
            <View style={styles.detailLeft}>
              <View style={styles.iconContainer}>
                <Icon 
                  name={item.icon as any} 
                  size={22} 
                  color={colors.primary} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text 
                  style={styles.detailValue} 
                  numberOfLines={1} 
                  ellipsizeMode="tail"
                >
                  {item.value}
                </Text>
              </View>
            </View>
            
            {(item.copyable || item.label === 'User ID') && (
              <TouchableOpacity
                onPress={() => copyToClipboard(item.value)}
                style={styles.copyButton}
              >
                <Icon 
                  name={copied && item.label === 'User ID' ? 'check' : 'content-copy'} 
                  size={20} 
                  color={copied && item.label === 'User ID' ? '#4CAF50' : '#666'}
                />
              </TouchableOpacity>
            )}
          </View>
          
          {copied && item.label === 'User ID' && (
            <Text style={styles.copiedText}>
              Copied to clipboard!
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderActionButtons = () => (
    <View style={[styles.card, { backgroundColor: '#fff', marginTop: 16 }]}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Language')}
        activeOpacity={0.7}
      >
        <View style={styles.actionButtonContent}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(156, 39, 176, 0.1)' }]}>
            <Icon name="translate" size={22} color="#9C27B0" />
          </View>
          <Text style={[styles.actionButtonText, { color: '#333' }]}>Language Settings</Text>
        </View>
        <Icon name="chevron-right" size={22} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Auth', { screen: 'EditProfile' })}
        activeOpacity={0.7}
      >
        <View style={styles.actionButtonContent}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
            <Icon name="account-edit" size={22} color="#2196F3" />
          </View>
          <Text style={[styles.actionButtonText, { color: '#333' }]}>Edit Profile</Text>
        </View>
        <Icon name="chevron-right" size={22} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionButton, { borderBottomWidth: 0 }]}
        onPress={handleSignOut} 
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.actionButtonContent}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
            <Icon name="logout" size={22} color="#F44336" />
          </View>
          <Text style={[styles.actionButtonText, { color: '#F44336' }]}>
            {isLoading ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color="#F44336" />
        ) : (
          <Icon name="chevron-right" size={22} color="#F44336" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary} 
          />
        }
      >
        {renderProfileHeader()}
        <View style={styles.content}>
          {renderProfileInfo()}
          {renderActionButtons()}
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            CareTrek v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: -20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  headerContent: { 
    alignItems: 'center', 
    paddingHorizontal: 24,
  },
  avatarContainer: { 
    position: 'relative', 
    marginBottom: 20,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  userInfo: { 
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  name: { 
    fontSize: 26, 
    fontWeight: '700', 
    marginBottom: 6,
    color: '#fff',
    textAlign: 'center',
    maxWidth: '90%',
  },
  email: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: '90%',
  },
  content: { 
    flex: 1, 
    padding: 20, 
    paddingTop: 30,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 20,
    color: '#333',
    letterSpacing: 0.5,
  },
  detailItem: { 
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  detailLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
    marginRight: 10,
  },
  iconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  detailLabel: { 
    fontSize: 13, 
    marginBottom: 2,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: { 
    fontSize: 16, 
    fontWeight: '500', 
    maxWidth: '90%',
    color: '#222',
  },
  copyButton: { 
    padding: 8, 
    marginLeft: 8,
    borderRadius: 8,
  },
  copiedText: { 
    fontSize: 12, 
    marginTop: 4, 
    textAlign: 'right',
    color: '#4CAF50',
    fontWeight: '500',
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 16, 
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  actionButtonContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
  },
  actionIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  actionButtonText: { 
    fontSize: 16, 
    fontWeight: '500',
    color: '#333',
  },
  versionText: { 
    textAlign: 'center', 
    marginTop: 30, 
    marginBottom: 20, 
    fontSize: 12, 
    color: '#999',
    letterSpacing: 0.3,
  },
});

export default ProfileScreen;
