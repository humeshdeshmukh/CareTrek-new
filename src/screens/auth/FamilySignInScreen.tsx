import React, { useState, useEffect, useLayoutEffect } from 'react';
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
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

type FamilySignInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FamilySignIn'>;

const FamilySignInScreen = () => {
  const navigation = useNavigation<FamilySignInScreenNavigationProp>();
  const { colors, isDark } = useTheme();

  // Set up header back button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('RoleSelection')}
          style={{ marginLeft: 10, padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.primary]);
  const { 
    signIn, 
    loading: authLoading, 
    error: authError,
    isAuthenticated,
    role
  } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; general?: string}>({});

  // Debug authentication state changes
  useEffect(() => {
    console.log('Auth state changed:', { isAuthenticated, role, authError });
  }, [isAuthenticated, role, authError]);

  // Redirect if already authenticated
  useEffect(() => {
    console.log('Checking authentication status:', { isAuthenticated, role });
    
    if (isAuthenticated) {
      console.log('User is authenticated, navigating to appropriate screen...');
      
      if (role === 'family') {
        console.log('Navigating to family home...');
        // Navigate to the FamilyNavigator which is registered in RootNavigator
        navigation.reset({
          index: 0,
          routes: [{ name: 'FamilyNavigator' }],
        });
      } else if (role === 'senior') {
        console.log('Navigating to senior home...');
        navigation.reset({
          index: 0,
          routes: [{ name: 'SeniorTabs' }],
        });
      }
    }
  }, [isAuthenticated, role, navigation]);

  // Clear errors when inputs change
  useEffect(() => {
    if (errors.email && email) setErrors(prev => ({...prev, email: undefined}));
    if (errors.password && password) setErrors(prev => ({...prev, password: undefined}));
  }, [email, password]);

  // Handle auth errors
  useEffect(() => {
    if (authError) {
      let errorMessage = 'An error occurred during sign in';
      
      if (authError.message) {
        if (authError.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (authError.message.includes('email not confirmed')) {
          errorMessage = 'Please verify your email before signing in. Check your inbox.';
        } else if (authError.message.includes('too many requests')) {
          errorMessage = 'Too many sign in attempts. Please try again later.';
        } else {
          errorMessage = authError.message;
        }
      }
      
      setErrors({general: errorMessage});
      setIsSubmitting(false);
    }
  }, [authError]);

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      setErrors({});
      
      console.log('Attempting to sign in with:', { email });
      const { user, error } = await signIn(email, password, 'family');
      
      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }
      
      console.log('Sign in successful, user:', user);
      
      // Force a small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Manually navigate if the automatic redirection doesn't work
      if (user) {
        console.log('Manually navigating to family section...');
        // Navigate to the FamilyNavigator which is registered in RootNavigator
        navigation.reset({
          index: 0,
          routes: [{ name: 'FamilyNavigator' }],
        });
      }
      
    } catch (error: any) {
      console.error('Unexpected error during sign in:', error);
      // Error handling is done in the authError useEffect
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToSignUp = () => {
    // Navigate directly to the SignUp screen
    navigation.navigate('SignUp', { 
      role: 'family',
      email: email,
      onSuccess: () => {
        // After successful signup, navigate back to sign in with the email pre-filled
        navigation.navigate('FamilySignIn', { email });
      }
    });
  };

return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Logo and Title */}
            <View style={styles.logoContainer}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="account-heart" size={50} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Family Member Sign In</Text>
            </View>

            {/* Error Message */}
            {errors.general && (
              <View style={[styles.errorContainer, { backgroundColor: colors.notification + '20' }]}>
                <Icon name="alert-circle" size={20} color={colors.notification} />
                <Text style={[styles.errorText, { color: colors.notification }]}>{errors.general}</Text>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: isDark ? colors.card : colors.background,
                    color: colors.text,
                    borderColor: errors.email ? colors.notification : colors.border
                  }
                ]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              {errors.email && (
                <Text style={[styles.errorText, { color: colors.notification }]}>{errors.email}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      backgroundColor: isDark ? colors.card : colors.background,
                      color: colors.text,
                      borderColor: errors.password ? colors.notification : colors.border
                    }
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
              </View>
              {errors.password && (
                <Text style={[styles.errorText, { color: colors.notification }]}>{errors.password}</Text>
              )}
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.button,
                { 
                  backgroundColor: colors.primary,
                  opacity: isSubmitting ? 0.7 : 1
                }
              ]}
              onPress={handleSignIn}
              disabled={isSubmitting || authLoading}
            >
              {(isSubmitting || authLoading) ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff' }]}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={navigateToSignUp} disabled={isSubmitting}>
                <Text style={[styles.signUpLink, { color: colors.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpText: {
    fontSize: 14,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

export default FamilySignInScreen;