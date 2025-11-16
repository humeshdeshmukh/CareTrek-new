import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../contexts/theme/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

export const PrivacyPolicyScreen = () => {
  const { isDark } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1A202C' : '#F7FAFC' }]}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.content, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
            Privacy Policy
          </Text>
          
          <Text style={[styles.lastUpdated, { color: isDark ? '#A0AEC0' : '#718096' }]}>
            Last updated: November 14, 2023
          </Text>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              1. Information We Collect
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              We collect information that you provide directly to us, such as when you create an account, update your profile, or communicate with us. This may include your name, email address, phone number, and other information you choose to provide.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              2. How We Use Your Information
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              We use the information we collect to provide, maintain, and improve our services, including to process transactions, send you related information, and respond to your comments and questions.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              3. Information Sharing
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              We do not share your personal information with third parties except as described in this Privacy Policy. We may share information with service providers who perform services on our behalf.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              4. Security
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              We take reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              5. Your Choices
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              You may update, correct, or delete information about you at any time by logging into your account or contacting us at support@caretrek.app.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              6. Changes to This Policy
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              We may change this Privacy Policy from time to time. If we make changes, we will notify you by revising the date at the top of the policy and, in some cases, we may provide you with additional notice.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              7. Contact Us
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              If you have any questions about this Privacy Policy, please contact us at support@caretrek.app.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
});

export default PrivacyPolicyScreen;
