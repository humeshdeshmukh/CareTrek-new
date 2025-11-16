// src/screens/auth/SeniorAuthScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/theme/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppDispatch } from '../../store/hooks';

type SeniorAuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SeniorAuth'>;

const SeniorAuthScreen: React.FC = () => {
  const navigation = useNavigation<SeniorAuthScreenNavigationProp>();
  const { colors } = useTheme();
  const { signIn, signUp, loading, user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();

  const [isSignIn, setIsSignIn] = useState<boolean>(true);


  // Form fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [name, setName] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
  }>({});

  // Toggle between sign in and sign up forms
  const toggleAuthMode = () => {
    const newIsSignIn = !isSignIn;
    setIsSignIn(newIsSignIn);

    // Clear form fields when toggling
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setErrors({});
  };

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'email':
        if (!value) newErrors.email = 'Email is required';
        else if (!/^\S+@\S+\.\S+$/.test(value)) newErrors.email = 'Please enter a valid email';
        else delete newErrors.email;
        break;

      case 'password':
        if (!value) newErrors.password = 'Password is required';
        else if (value.length < 8) newErrors.password = 'Password must be at least 8 characters';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value))
          newErrors.password = 'Password must contain uppercase, lowercase, and number';
        else delete newErrors.password;
        break;

      case 'confirmPassword':
        if (value !== password) newErrors.confirmPassword = 'Passwords do not match';
        else delete newErrors.confirmPassword;
        break;

      case 'name':
        if (!value.trim()) newErrors.name = 'Name is required';
        else delete newErrors.name;
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return !newErrors[field as keyof typeof newErrors];
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Email
    if (!email) newErrors.email = 'Email is required';
    else if (!emailRegex.test(email)) newErrors.email = 'Please enter a valid email';

    // Password
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      newErrors.password = 'Password must contain uppercase, lowercase, and number';

    if (!isSignIn) {
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      if (!name.trim()) newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (isSignIn) {
        // Sign in and handle the response
        const result = await signIn(email, password, 'senior');
        if (result?.error) {
          throw new Error(result.error);
        }
        
        // The navigation will be handled by the useEffect hook above
        // when the isAuthenticated state changes in the Redux store
      } else {
        // Call signUp with required arguments
        const res: any = await signUp(
          email,
          password,
          name, // name
          'senior' // role
        );
        if (res && res.error) throw new Error(res.error);

        Alert.alert('Success', 'Account created successfully! Please sign in.');
        setIsSignIn(true);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error?.message || 'An error occurred. Please try again.');
    }
  };

  const isSubmitDisabled = () => {
    if (loading) return true;
    if (!email || !password) return true;
    if (!isSignIn && (!confirmPassword || !name)) return true;
    return false;
  };

  // Header left back button
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('RoleSelection' as any)}
          style={{ marginLeft: 10, padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.primary]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.logoContainer}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="account" size={50} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {isSignIn ? 'Senior Sign In' : 'Create Senior Account'}
              </Text>
            </View>

            <View style={styles.formContainer}>
              {!isSignIn && (
                <View style={styles.inputBlock}>
                  <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                  <View style={[styles.inputContainer, { 
                    backgroundColor: colors.card,
                    borderColor: errors.name ? 'red' : colors.border 
                  }]}>
                    <Icon name="account" size={20} color={colors.primary} style={styles.icon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Enter your full name"
                      placeholderTextColor={colors.textSecondary}
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        validateField('name', text);
                      }}
                      onBlur={() => validateField('name', name)}
                      autoCapitalize="words"
                    />
                  </View>
                  {errors.name && <Text style={[styles.errorText, { color: 'red' }]}>{errors.name}</Text>}
                </View>
              )}

              <View style={styles.inputBlock}>
                <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: colors.card,
                  borderColor: errors.email ? 'red' : colors.border 
                }]}>
                  <Icon name="email" size={20} color={colors.primary} style={styles.icon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      validateField('email', text);
                    }}
                    onBlur={() => validateField('email', email)}
                  />
                </View>
                {errors.email && <Text style={[styles.errorText, { color: 'red' }]}>{errors.email}</Text>}
              </View>

              <View style={styles.inputBlock}>
                <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: colors.card,
                  borderColor: errors.password ? 'red' : colors.border 
                }]}>
                  <Icon name="lock" size={20} color={colors.primary} style={styles.icon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      validateField('password', text);
                    }}
                    onBlur={() => validateField('password', password)}
                  />
                </View>
                {errors.password && <Text style={[styles.errorText, { color: 'red' }]}>{errors.password}</Text>}
              </View>

              {!isSignIn && (
                <View style={styles.inputBlock}>
                  <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                  <View style={[styles.inputContainer, { 
                    backgroundColor: colors.card,
                    borderColor: errors.confirmPassword ? 'red' : colors.border 
                  }]}>
                    <Icon name="lock-check" size={20} color={colors.primary} style={styles.icon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Confirm your password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        validateField('confirmPassword', text);
                      }}
                      onBlur={() => validateField('confirmPassword', confirmPassword)}
                    />
                  </View>
                  {errors.confirmPassword && <Text style={[styles.errorText, { color: 'red' }]}>{errors.confirmPassword}</Text>}
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, { 
                  backgroundColor: colors.primary,
                  opacity: (isSubmitDisabled() || loading) ? 0.7 : 1 
                }]}
                onPress={handleSubmit}
                disabled={isSubmitDisabled() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isSignIn ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity 
                style={[styles.socialButton, { 
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }]}
                onPress={() => {}}
                disabled={loading}
              >
                <Icon name="google" size={20} color={colors.text} />
                <Text style={[styles.socialButtonText, { color: colors.text }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary }}>
                  {isSignIn ? "Don't have an account? " : 'Already have an account? '}
                </Text>
                <TouchableOpacity onPress={toggleAuthMode} disabled={loading}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>
                    {isSignIn ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isSignIn && (
                <TouchableOpacity 
                  style={styles.forgotPasswordButton} 
                  onPress={() => navigation.navigate('ForgotPassword' as any)} 
                  disabled={loading}
                >
                  <Text style={{ color: colors.primary, fontWeight: '500' }}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
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
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    flex: 1,
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  icon: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    color: 'red',
  },
  button: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 14,
    color: '#94A3B8',
    marginHorizontal: 8,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  socialButtonText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
    marginTop: 8,
    borderTopWidth: 1,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 8,
  },
});

export default SeniorAuthScreen;
