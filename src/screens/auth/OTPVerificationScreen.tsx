import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard, Alert, TextInputProps, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../contexts/auth/AuthContext';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// Custom OTP Input Component to handle refs properly
const OTPInput = forwardRef<TextInput, TextInputProps>((props, ref) => (
  <TextInput
    ref={ref}
    style={[styles.otpInput, { borderColor: useTheme().colors.border, color: useTheme().colors.text, backgroundColor: useTheme().colors.card }]}
    keyboardType="number-pad"
    maxLength={1}
    selectTextOnFocus
    textContentType="oneTimeCode"
    autoComplete="sms-otp"
    {...props}
  />
));

OTPInput.displayName = 'OTPInput';

type OTPVerificationScreenRouteProp = RouteProp<RootStackParamList, 'OTPVerification'>;
type OTPVerificationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OTPVerification'>;

const OTPVerificationScreen = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpInputs = useRef<(TextInput | null)[]>(Array(6).fill(null));
  const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
  const route = useRoute<OTPVerificationScreenRouteProp>();
  const { phoneNumber } = route.params;
  const { verifyOtp, loginWithPhone } = useAuth();
  const { colors } = useTheme();

  // Handle OTP input change
  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus to next input
    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }

    // Auto-submit when last digit is entered
    if (index === 5 && value) {
      handleVerifyOtp();
    }
  };

  // Handle backspace
  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    if (isVerifying) return;
    
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    try {
      const success = await verifyOtp('', otpCode);
      if (success) {
        // Navigate to role selection or home based on user state
        navigation.navigate('RoleSelection');
      } else {
        Alert.alert('Error', 'Invalid OTP. Please try again.');
      }
    } catch (error: any) {
      console.error('OTP Verification Error:', error);
      Alert.alert('Error', error.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (isResendDisabled) return;
    
    try {
      await loginWithPhone(phoneNumber);
      setResendTimer(60);
      setIsResendDisabled(true);
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
      Alert.alert('Success', 'A new verification code has been sent to your phone.');
    } catch (error: any) {
      console.error('Resend OTP Error:', error);
      Alert.alert('Error', error.message || 'Failed to resend OTP. Please try again.');
    }
  };

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0 && isResendDisabled) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else if (resendTimer === 0) {
      setIsResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [resendTimer, isResendDisabled]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.otpTitle, { color: colors.text }]}>Enter Verification Code</Text>
        <Text style={[styles.otpSubtitle, { color: colors.textSecondary }]}>
          We've sent a 6-digit code to {phoneNumber}
        </Text>
        {isVerifying && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <OTPInput
              key={index}
              ref={(ref) => {
                otpInputs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, { backgroundColor: colors.primary }]}
          onPress={handleVerifyOtp}
          disabled={otp.some((digit) => !digit)}>
          <Text style={styles.verifyButtonText}>Verify</Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={[styles.resendText, { color: colors.textSecondary }]}>
            Didn't receive the code? 
          </Text>
          <TouchableOpacity
            onPress={handleResendOtp}
            disabled={isResendDisabled}>
            <Text
              style={[
                styles.resendButton,
                {
                  color: isResendDisabled ? colors.disabled : colors.primary,
                  textDecorationLine: 'underline',
                },
              ]}>
              {isResendDisabled ? `Resend in ${resendTimer}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  otpSubtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpInput: {
    width: 45,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 24,
    textAlign: 'center',
    marginHorizontal: 5,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  verifyButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
  },
  resendButton: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OTPVerificationScreen;
