import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

// Define your deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'caretrek://', // Custom scheme for deep linking
    'https://caretrek.app', // Your website URL
  ],
  config: {
    // Initial route name to be used on app start
    initialRouteName: 'Welcome',
    screens: {
      // Auth Stack
      Welcome: 'welcome',
      RoleSelection: 'role-selection',
      FamilySignIn: 'sign-in/family',
      SeniorAuth: 'sign-in/senior',
      SignIn: 'sign-in/:role?',
      SignUp: 'sign-up',
      ForgotPassword: 'forgot-password',
      OTPVerification: 'verify-otp',
      Emergency: 'emergency',
      EditProfile: 'profile/edit',
      
      // Family Stack
      MainTabs: {
        path: 'family',
        screens: {
          HomeTab: 'home',
          Seniors: 'seniors',
          Alerts: 'alerts',
          MessagesTab: 'messages',
          Settings: 'settings',
        },
      },
      
      // Family Stack Screens
      SeniorDetail: 'senior/:seniorId',
      NewConnectSenior: 'senior/connect',
      HealthHistory: 'senior/:seniorId/health',
      HomeNew: 'home-new',
      AddSenior: 'senior/add',
      
      // Modals
      FilterAlerts: 'modals/filter-alerts',
      FilterMessages: 'modals/filter-messages',
      SortSeniors: 'modals/sort-seniors',
      SortAlerts: 'modals/sort-alerts',
      SortMessages: 'modals/sort-messages',
      
      // Settings
      Settings: 'settings',
      ChangePassword: 'settings/change-password',
      NotificationSettings: 'settings/notifications',
      PrivacyPolicy: 'privacy-policy',
      TermsOfService: 'terms',
      HelpCenter: 'help',
      ContactSupport: 'contact',
      About: 'about',
      
      // Senior Stack
      SeniorHome: 'senior/home',
      SeniorDashboard: 'senior/dashboard',
      MedicationReminders: 'senior/medication',
      EmergencyContacts: 'senior/emergency',
      SeniorProfile: 'senior/profile',
      
      // Common
      WebView: 'webview',
      Loading: 'loading',
      NotFound: '*',
      ImageViewer: 'image',
      Onboarding: 'onboarding',
      DeepLink: 'deeplink',
    },
  },
};

export default linking;
