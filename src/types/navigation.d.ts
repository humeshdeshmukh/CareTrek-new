import { StackScreenProps } from '@react-navigation/stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Home: undefined;
  // Add other screen types here
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, T>;

// Declare modules for screens
declare module '../screens/HomeScreen' {
  import { FunctionComponent } from 'react';
  import { RootStackScreenProps } from '../types/navigation';
  
  const HomeScreen: FunctionComponent<RootStackScreenProps<'Home'>>;
  export default HomeScreen;
}

declare module '../screens/OnboardingScreen' {
  import { FunctionComponent } from 'react';
  import { RootStackScreenProps } from '../types/navigation';
  
  const OnboardingScreen: FunctionComponent<RootStackScreenProps<'Onboarding'>>;
  export default OnboardingScreen;
}

declare module '../screens/AuthScreen' {
  import { FunctionComponent } from 'react';
  import { RootStackScreenProps } from '../types/navigation';
  
  const AuthScreen: FunctionComponent<RootStackScreenProps<'Auth'>>;
  export default AuthScreen;
}
