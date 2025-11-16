// src/components/AppText.tsx
import React from 'react';
import { Text as RNText, TextProps, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../contexts/theme/ThemeContext';

type AppTextProps = TextProps & {
  variant?: 'regular' | 'medium' | 'semiBold' | 'bold';
  style?: StyleProp<TextStyle>;
};

export const AppText: React.FC<AppTextProps> = ({ variant = 'regular', style, children, ...props }) => {
  const { colors, fonts } = useTheme();

  const fontFamily =
    variant === 'regular'
      ? fonts?.regular || 'System'
      : variant === 'medium'
      ? fonts?.medium || 'System'
      : variant === 'semiBold'
      ? fonts?.semiBold || 'System'
      : fonts?.bold || 'System';

  return (
    <RNText
      {...props}
      style={[
        {
          color: colors.text,
          fontFamily,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
};

export default AppText;
