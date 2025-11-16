// src/contexts/theme/ThemeContext.tsx
import React, { createContext, useContext, useMemo, ReactNode, useState } from 'react';
import { ColorValue } from 'react-native';

export type ThemeFonts = {
  regular?: string;
  medium?: string;
  semiBold?: string;
  bold?: string;
};

export type ThemeColors = {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
  textSecondary?: string;
};

export type ThemeContextValue = {
  colors: ThemeColors;
  fonts: ThemeFonts;
  isDark: boolean;
  toggleTheme?: () => void;
};

const LIGHT_THEME: { colors: ThemeColors; fonts: ThemeFonts } = {
  colors: {
    primary: '#2F855A', // Updated to match onboarding green
    background: '#FFFBEF', // Light beige background from onboarding
    card: '#ffffff',
    text: '#1E293B', // Dark slate from onboarding
    border: '#E2E8F0', // Light gray border
    notification: '#ff3b30',
    textSecondary: '#64748B', // Medium gray from onboarding
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
};

const DARK_THEME: { colors: ThemeColors; fonts: ThemeFonts } = {
  colors: {
    primary: '#48BB78', // Brighter green from onboarding dark mode
    background: '#171923', // Dark background from onboarding
    card: '#1A202C', // Slightly lighter dark for cards
    text: '#F8FAFC', // Off-white text
    border: '#2D3748', // Darker border
    notification: '#ff3b30',
    textSecondary: '#94A3B8', // Lighter gray for secondary text
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: LIGHT_THEME.colors,
  fonts: LIGHT_THEME.fonts,
  isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState<boolean>(false);

  const toggleTheme = () => setIsDark((s) => !s);

  const value = useMemo(
    () => ({
      colors: isDark ? DARK_THEME.colors : LIGHT_THEME.colors,
      fonts: isDark ? DARK_THEME.fonts : LIGHT_THEME.fonts,
      isDark,
      toggleTheme,
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
