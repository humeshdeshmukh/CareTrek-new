import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
  SafeAreaView,
  useWindowDimensions,
  ViewStyle,
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../hooks/useAuth';
import * as Haptics from 'expo-haptics';

type ShareOption = {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
};

const IdShareScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const seniorId = user?.id || 'Not Available';
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCopyOptions, setShowCopyOptions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const shareOptions: ShareOption[] = [
    { id: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
    { id: 'messages', icon: 'message-text', label: 'Messages', color: '#0088FF' },
    { id: 'email', icon: 'email', label: 'Email', color: '#EA4335' },
    { id: 'more', icon: 'dots-horizontal', label: 'More', color: colors.text },
  ];

  const copyOptions = [
    { id: 'id', icon: 'identifier', label: 'Copy ID Only' },
    { id: 'message', icon: 'message-text', label: 'Copy Message' },
    { id: 'link', icon: 'link', label: 'Copy App Link' },
  ];

  const getFormattedShareMessage = (): string => {
    return `👋 Hello,\n\nI'd like to connect with you on CareTrek! Here's my Senior ID:\n\n🔑 ${seniorId}\n\nTo get started, please:\n1. Download the CareTrek app from the App Store or Google Play\n2. Create an account (if you haven't already)\n3. Go to 'Add Connection' and enter my ID\n\nLooking forward to connecting with you!\n\nBest regards,\n${user?.displayName || 'A CareTrek User'}\n\n---\nSent via CareTrek App`;
  };

  const getAppStoreLinks = (): string => {
    return Platform.select({
      ios: 'https://apps.apple.com/app/caretrek/idYOUR_APP_ID',
      android: 'https://play.google.com/store/apps/details?id=com.caretrek.app',
    }) || 'https://caretrek.app';
  };

  const copyToClipboard = async (type: 'id' | 'message' | 'link' = 'id') => {
    try {
      let textToCopy = seniorId;
      
      if (type === 'message') {
        textToCopy = getFormattedShareMessage();
      } else if (type === 'link') {
        textToCopy = getAppStoreLinks();
      }

      await Clipboard.setStringAsync(textToCopy);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setCopied(true);
      setShowCopyOptions(false);
      
      // Show success message
      const message = 
        type === 'id' ? 'ID copied to clipboard!' :
        type === 'message' ? 'Message copied to clipboard!' :
        'App link copied to clipboard!';
      
      Alert.alert('Success', message);
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleShare = async (method?: string) => {
    try {
      const message = getFormattedShareMessage();
      const appLink = getAppStoreLinks();
      
      const shareOptions = {
        message: `${message}\n\nDownload CareTrek: ${appLink}`,
        title: 'Connect with me on CareTrek',
        ...(Platform.OS === 'android' && { subject: 'CareTrek Connection Request' }),
      };

      if (method === 'whatsapp') {
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareOptions.message)}`;
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
          return;
        }
      } else if (method === 'email') {
        const emailUrl = `mailto:?subject=CareTrek%20Connection%20Request&body=${encodeURIComponent(shareOptions.message)}`;
        await Linking.openURL(emailUrl);
        return;
      } else if (method === 'messages') {
        const smsUrl = `sms:?&body=${encodeURIComponent(shareOptions.message)}`;
        await Linking.openURL(smsUrl);
        return;
      }

      // Default share dialog
      await Share.share(shareOptions);
      
      // Analytics event can be tracked here
      // trackEvent('share_id', { method: method || 'system' });
      
    } catch (error) {
      console.error('Error sharing ID:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to share. Please try another method.');
    } finally {
      setShowShareOptions(false);
    }
  };

  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const animateOut = (callback?: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (callback) callback();
    });
  };

  const toggleCopyOptions = () => {
    if (showCopyOptions) {
      animateOut(() => setShowCopyOptions(false));
    } else {
      setShowCopyOptions(true);
      animateIn();
    }
  };

  const toggleShareOptions = () => {
    if (showShareOptions) {
      animateOut(() => setShowShareOptions(false));
    } else {
      setShowShareOptions(true);
      animateIn();
    }
  };


  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => {
      if (showCopyOptions) toggleCopyOptions();
      if (showShareOptions) toggleShareOptions();
      Keyboard.dismiss();
    }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.headerRight} />
          </View>

          {/* ID Card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 24 }]}>
              Your Senior ID
            </Text>
            
            <View style={styles.idContainer}>
              <View style={styles.idTextContainer}>
                <Text 
                  style={[styles.idText, { color: colors.text }]}
                  selectable
                  selectionColor={colors.primary + '40'}
                >
                  {seniorId}
                </Text>
                {copied && (
                  <Animated.Text 
                    style={[
                      styles.copiedText, 
                      { 
                        color: colors.success || '#10B981',
                        opacity: fadeAnim
                      }
                    ]}
                  >
                    Copied!
                  </Animated.Text>
                )}
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  onPress={toggleCopyOptions}
                  style={[styles.actionButton, { backgroundColor: colors.background }]}
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={toggleShareOptions}
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="share-social" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 24 }]}>
              Share this ID with family members to connect with you on CareTrek
            </Text>
            
            {/* Copy Options Modal */}
            {showCopyOptions && (
              <Animated.View 
                style={[styles.optionsContainer, { opacity: fadeAnim }]}
              >
                <Text style={[styles.optionsTitle, { color: colors.text }]}>
                  Copy Options
                </Text>
                {copyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.optionButton, { borderBottomColor: colors.border || '#E5E7EB' }]}
                    onPress={() => copyToClipboard(option.id as any)}
                  >
                    <MaterialCommunityIcons 
                      name={option.icon as any} 
                      size={20} 
                      color={colors.primary} 
                      style={styles.optionIcon}
                    />
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}
            
            {/* Share Options Modal */}
            {showShareOptions && (
              <Animated.View 
                style={[styles.optionsContainer, { opacity: fadeAnim }]}
              >
                <View style={styles.shareIconsContainer}>
                  {shareOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.shareIconButton}
                      onPress={() => handleShare(option.id === 'more' ? undefined : option.id)}
                    >
                      <View 
                        style={[
                          styles.shareIconContainer, 
                          { 
                            backgroundColor: option.id === 'more' 
                              ? colors.background 
                              : `${option.color}15`
                          }
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name={option.icon as any} 
                          size={24} 
                          color={option.id === 'more' ? colors.text : option.color} 
                        />
                      </View>
                      <Text 
                        style={[
                          styles.shareIconLabel, 
                          { color: colors.textSecondary }
                        ]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            )}
          </View>
          
          {/* Instructions */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 16 }]}>
            <View style={styles.instructionItem}>
              <View style={[styles.instructionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="person-add" size={20} color={colors.primary} />
              </View>
              <View style={styles.instructionTextContainer}>
                <Text style={[styles.instructionTitle, { color: colors.text }]}>
                  How to Connect
                </Text>
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  Share your ID with family members so they can add you as a connection in the CareTrek app.
                </Text>
              </View>
            </View>
            
            <View style={[styles.divider, { backgroundColor: colors.border || '#E5E7EB' }]} />
            
            <View style={styles.instructionItem}>
              <View style={[styles.instructionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              </View>
              <View style={styles.instructionTextContainer}>
                <Text style={[styles.instructionTitle, { color: colors.text }]}>
                  Your Privacy
                </Text>
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  Your ID is unique to you. Only share it with people you trust to connect with you.
                </Text>
              </View>
            </View>
          </View>
          
        </ScrollView>
        
        {/* Bottom Action Button */}
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.mainActionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleShare()}
          >
            <Ionicons name="share-social" size={20} color="#FFFFFF" />
            <Text style={styles.mainActionButtonText}>
              Share ID
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginLeft: -32,
  },
  headerRight: {
    width: 40,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  idTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  idText: {
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: '600',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  copiedText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  helperText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  optionsContainer: {
    width: '100%',
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  shareIconsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  shareIconButton: {
    width: '25%',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
  },
  shareIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareIconLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructionTextContainer: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: 24,
  },
  mainActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  mainActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default IdShareScreen;
