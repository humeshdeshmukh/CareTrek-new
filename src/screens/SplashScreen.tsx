import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme } from '../contexts/theme/ThemeContext';
import Svg, { G, Path, Circle } from 'react-native-svg';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

interface SplashScreenProps {
  navigation: SplashScreenNavigationProp;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { width } = Dimensions.get('window');
  const logoSize = width * 0.7;
  
  // Theme colors
  const backgroundColor = isDark ? '#1A202C' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1A202C';
  const mutedColor = isDark ? '#A0AEC0' : '#718096';
  const primaryColor = isDark ? '#63B3ED' : '#2B6CB0';
  
  // Start animations when component mounts
  useEffect(() => {
    // Fade in and scale up animation
    const fadeIn = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 30,
        useNativeDriver: true,
      })
    ]);

    // Pulse animation for the heart
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Start animations
    fadeIn.start();
    pulse.start();
    
    // Navigate to Welcome screen after 3 seconds
    const timer = setTimeout(() => {
      navigation.navigate('Welcome');
    }, 3000);
    
    // Cleanup function
    return () => {
      fadeIn.stop();
      pulse.stop();
      clearTimeout(timer);
    };
  }, [fadeAnim, scaleAnim, pulseAnim, navigation]);
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Animated.View 
        style={[
          styles.logoContainer,
          { 
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
            ]
          }
        ]}
      >
        <Svg width={logoSize} height={logoSize} viewBox="0 0 300 300">
          {/* Background Circle */}
          <Circle 
            cx="150" 
            cy="150" 
            r="140" 
            fill={primaryColor}
            fillOpacity={isDark ? 0.2 : 0.9} 
          />
          
          {/* Abstract People Silhouette */}
          <G fill={isDark ? '#E2E8F0' : '#2F855A'}>
            <Path d="M150 90C167.673 90 182 75.6731 182 58C182 40.3269 167.673 26 150 26C132.327 26 118 40.3269 118 58C118 75.6731 132.327 90 150 90Z" />
            <Path d="M182 110H118C105.85 110 96 119.85 96 132V150C96 162.15 105.85 172 118 172H182C194.15 172 204 162.15 204 150V132C204 119.85 194.15 110 182 110Z" />
          </G>
          
          {/* Heart Pulse Effect */}
          <Animated.View style={{
            opacity: pulseAnim,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Path 
              d="M150 220C160 210 180 190 190 170C200 150 190 130 170 120C160 115 150 120 145 125C140 120 130 115 120 120C100 130 90 150 100 170C110 190 130 210 140 220" 
              fill="none" 
              stroke="white" 
              strokeWidth="8" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </Animated.View>
        </Svg>
        
        <Animated.Text style={[
          styles.appName,
          { 
            opacity: fadeAnim,
            color: textColor,
            marginTop: 20,
          }
        ]}>
          CareTrek
        </Animated.Text>
        
        <Animated.Text style={[
          styles.tagline,
          { 
            opacity: fadeAnim,
            color: mutedColor,
          }
        ]}>
          Bridging Generations
        </Animated.Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
  },
  tagline: {
    fontSize: 16,
    marginTop: 10,
    opacity: 0.8,
  },
});

export default SplashScreen;