export interface ThemeColors {
  // Base colors
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary?: string;
  border: string;
  
  // Brand colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Status colors
  success: string;
  warning: string;
  danger: string;
  info: string;
  
  // Grayscale
  white: string;
  lightGray: string;
  gray: string;
  darkGray: string;
  black: string;
  
  // UI elements
  separator?: string;
  disabled?: string;
  placeholder?: string;
  backdrop: string;
  
  // Transparent
  transparent: string;
  overlay: string;
  
  // Additional
  surface?: string;
}

export interface Theme {
  light: ThemeColors;
  dark: ThemeColors;
  isDark: boolean;
  // Add any component-specific theme overrides
  button?: {
    primary: {
      background: string;
      text: string;
    };
    secondary: {
      background: string;
      text: string;
    };
  };
}
