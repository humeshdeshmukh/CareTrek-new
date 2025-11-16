import { RootStackParamList as NavigationRootStackParamList } from '../navigation/types';

// Extend the RootStackParamList to include all screen names
declare global {
  namespace ReactNavigation {
    interface RootParamList extends NavigationRootStackParamList {
      // Add any additional screen names here if needed
    }
  }
}

// Re-export all types from the navigation module
export * from '../navigation/types';

// Define the RootStackParamList type that includes all screens
export type RootStackParamList = NavigationRootStackParamList;

// Define a combined type for all possible screen names
export type ScreenNames = keyof RootStackParamList;