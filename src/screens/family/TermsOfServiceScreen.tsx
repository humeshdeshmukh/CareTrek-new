import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../contexts/theme/ThemeContext';

export const TermsOfServiceScreen = () => {
  const { isDark } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1A202C' : '#F7FAFC' }]}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.content, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
          <Text style={[styles.title, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
            Terms of Service
          </Text>
          
          <Text style={[styles.lastUpdated, { color: isDark ? '#A0AEC0' : '#718096' }]}>
            Last updated: November 14, 2023
          </Text>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              1. Acceptance of Terms
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              By accessing or using the CareTrek application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              2. Description of Service
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              CareTrek provides a platform for family members to monitor and assist seniors in their daily activities, including health monitoring, medication reminders, and emergency alerts.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              3. User Accounts
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              4. User Conduct
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              You agree not to use the service to:
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              • Violate any laws or regulations
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              • Infringe on the rights of others
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              • Transmit any harmful or malicious code
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              • Interfere with the service's operation
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              5. Privacy
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              Your use of the service is also governed by our Privacy Policy. Please review our Privacy Policy, which is incorporated into these Terms of Service by this reference.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              6. Medical Disclaimer
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              The service is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              7. Limitation of Liability
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              In no event shall CareTrek be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              8. Changes to Terms
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              We reserve the right to modify these terms at any time. We will provide notice of any changes by updating the "Last Updated" date at the top of these terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
              9. Contact Information
            </Text>
            <Text style={[styles.text, { color: isDark ? '#E2E8F0' : '#4A5568' }]}>
              If you have any questions about these Terms of Service, please contact us at support@caretrek.app.
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
    marginBottom: 8,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    marginLeft: 16,
    marginBottom: 4,
  },
});

export default TermsOfServiceScreen;
