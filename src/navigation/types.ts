export type UserRole = 'family' | 'senior';

export type SignUpParams = {
  role: UserRole;
  email?: string;
  name?: string;
  phoneNumber?: string;
};

// Authentication Stack
export type AuthStackParamList = {
  Welcome: undefined;
  FamilySignIn: { email?: string };
  SeniorAuth: { role?: UserRole };
  SignIn: { role?: UserRole };
  SignUp: SignUpParams;
  ForgotPassword: { email?: string };
  OTPVerification: { 
    phoneNumber: string;
    verificationId: string;
    role: UserRole;
    isSignUp?: boolean;
  };
  Emergency: { role: UserRole };
  EditProfile: undefined;
};

// Family Stack
export type FamilyTabParamList = {
  HomeTab: undefined;
  Seniors: { refresh?: boolean };
  Alerts: undefined;
  MessagesTab: undefined;
  Settings: undefined;
};

export type FamilyStackParamList = {
  // Tabs
  MainTabs: undefined;
  
  // Screens
  SeniorDetail: { seniorId: string };
  NewConnectSenior: undefined;
  HomeNew: undefined;
  AddSenior: undefined;
  
  // Modals
  FilterAlerts: undefined;
  FilterMessages: undefined;
  SortSeniors: undefined;
  SortAlerts: undefined;
  SortMessages: undefined;
  
  // Settings
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  NotificationSettings: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  HelpCenter: undefined;
  ContactSupport: undefined;
  About: undefined;
};

export type SeniorStackParamList = {
  // Senior Home
  SeniorHome: undefined;
  
  // Health & Safety
  HealthDashboard: undefined;
  MedicationReminders: undefined;
  EmergencyContacts: undefined;
  
  // Profile & Settings
  SeniorProfile: undefined;
  SeniorSettings: undefined;
  
  // Help & Support
  HelpCenter: undefined;
  ContactSupport: undefined;
  
  // Additional screens
  Medication: undefined;
  Appointments: undefined;
  Chat: undefined;
  HomeLocation: undefined;
};

// Re-export RootStackParamList from RootNavigator to avoid duplication
export type { RootStackParamList } from './RootNavigator';
import type { RootStackParamList } from './RootNavigator';

// Helper types for navigation props
export type ScreenProps<T extends keyof RootStackParamList> = {
  navigation: {
    navigate: (screen: T, params?: RootStackParamList[T]) => void;
    goBack: () => void;
    // Add other navigation methods as needed
  };
  route: {
    params: RootStackParamList[T];
    name: string;
    key: string;
  };
};
