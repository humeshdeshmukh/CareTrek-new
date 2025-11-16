import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type FamilyAuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FamilyAuth' | 'Auth'>;

const FamilyAuthScreen = () => {
  const navigation = useNavigation<FamilyAuthScreenNavigationProp>();
  const { colors, isDark } = useTheme();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // The navigation will be handled by the AppNavigator's conditional rendering
          // based on the authentication state
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password, 'family');
      
      // The navigation will be handled by the AppNavigator's conditional rendering
      // based on the updated authentication state
    } catch (error: any) {
      let errorMessage = 'An error occurred during sign in';
      
      // Handle specific error cases
      if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before signing in. Check your inbox for a verification link.';
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('email is not confirmed')) {
        errorMessage = 'Please check your email for a verification link before signing in.';
      } else if (error.message.includes('too many requests')) {
        errorMessage = 'Too many sign in attempts. Please try again later.';
      } else {
        // For any other errors, use the error message if available
        errorMessage = error.message || errorMessage;
      }
      
      Alert.alert('Sign In Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to SignUp screen through the Auth navigator
  const navigateToSignUp = () => {
    navigation.navigate('Auth', { 
      screen: 'SignUp',
      params: {
        role: 'family' as const,
        email: email // Pre-fill the email if available
      }
    });
  };

  // Navigate to ForgotPassword screen
  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword', { email });
  };

  // Show loading indicator while checking auth state
  if (!authChecked) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.logoContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Icon name="account-heart" size={50} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Family Member Sign In</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#2D3748' : '#F7FAFC',
                color: colors.text,
                borderColor: isDark ? '#4A5568' : '#E2E8F0'
              }]}
              placeholder="Enter your email"
              placeholderTextColor={isDark ? '#A0AEC0' : '#718096'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Password</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#2D3748' : '#F7FAFC',
                color: colors.text,
                borderColor: isDark ? '#4A5568' : '#E2E8F0'
              }]}
              placeholder="Enter your password"
              placeholderTextColor={isDark ? '#A0AEC0' : '#718096'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity 
              style={[styles.socialButton, { 
                backgroundColor: isDark ? '#2D3748' : '#F7FAFC',
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
                borderRadius: 8,
                marginTop: 16
              }]}
              onPress={() => {}}
              disabled={isLoading}
            >
              <Icon name="google" size={20} color={colors.text} />
              <Text style={[styles.socialButtonText, { 
                color: colors.text,
                marginLeft: 12,
                fontSize: 16,
                fontWeight: '500'
              }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={navigateToSignUp}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={navigateToForgotPassword}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPassword: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FamilyAuthScreen;
