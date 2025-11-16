import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Animated, 
  Easing, 
  StatusBar,
  Platform,
  Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme } from '../contexts/theme/ThemeContext';
import { Svg, Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { Ionicons } from '@expo/vector-icons';

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');

// Particle Component
const Particle = ({ color, size, style, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000,
          delay: delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    );
    
    animation.start();
    return () => animation.stop();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20]
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3]
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateY }],
          opacity,
        },
        style,
      ]}
    />
  );
};

// Animated Background Gradient
const AnimatedBackground = ({ isDark }) => {
  const gradientAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientAnim, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: false,
        })
      ])
    ).start();
  }, []);

  const gradientStart = isDark ? '#171923' : '#FFFBEF';
  const gradientEnd = isDark ? '#2D3748' : '#E2E8F0';
  
  const gradientColors = gradientAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [gradientStart, gradientEnd],
  });

  return (
    <Animated.View 
      style={[StyleSheet.absoluteFill, { 
        backgroundColor: gradientColors,
      }]}
    />
  );
};

const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { isDark, theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonPressAnim = useRef(new Animated.Value(0)).current;
  
  // Generate particles
  const particles = Array(15).fill(0).map((_, i) => ({
    id: i,
    size: Math.random() * 6 + 2,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: Math.random() * 2000,
  }));

  // Animation effects
  useEffect(() => {
    // Reset animations
    fadeAnim.setValue(0);
    slideUp.setValue(50);
    scaleAnim.setValue(0.9);
    
    // Start animations
    Animated.parallel([
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        delay: 300,
      }),
      // Slide up
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      // Scale in
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      // Button press animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonScale, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(buttonScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          })
        ])
      )
    ]).start();
  }, []);

  const handlePressIn = () => {
    setIsPressed(true);
    Vibration.vibrate(5);
    Animated.spring(buttonPressAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(buttonPressAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    navigation.navigate('Language');
  };


  // Theme colors
  const colors = {
    text: isDark ? '#E2E8F0' : '#2D3748',
    subtext: isDark ? '#E2E8F0' : '#2D3748',
    button: isDark ? '#48BB78' : '#2F855A',
    buttonPressed: isDark ? '#38A169' : '#2C7A5B',
    background: isDark ? '#171923' : '#FFFBEF',
    card: isDark ? '#2D3748' : '#FFFFFF',
    shadow: isDark ? '#00000040' : '#2D374840',
  };

  const buttonScaleInterpolate = buttonPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  });

  const buttonShadow = isPressed 
    ? {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
      }
    : {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
      };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent 
      />
      
      {/* Animated Background */}
      <AnimatedBackground isDark={isDark} />
      
      {/* Particles */}
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          size={particle.size}
          color={isDark ? '#48BB78' : '#2F855A'}
          style={{
            left: particle.left,
            top: particle.top,
            opacity: 0.5,
          }}
          delay={particle.delay}
        />
      ))}

{/* Main Content */}
      <Animated.View 
        style={[
          styles.contentContainer,
          { 
            opacity: fadeAnim,
            transform: [
              { translateY: slideUp },
              { scale: scaleAnim }
            ],
          }
        ]}
      >
        {/* App Icon */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { 
              backgroundColor: isDark ? 'rgba(45, 55, 72, 0.7)' : 'rgba(255, 255, 255, 0.7)',
              borderColor: isDark ? 'rgba(72, 187, 120, 0.3)' : 'rgba(47, 133, 90, 0.3)',
              transform: [{ 
                rotate: buttonPressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '5deg']
                }) 
              }]
            }
          ]}
        >
          <Ionicons 
            name="heart-circle" 
            size={80} 
            color={isDark ? '#48BB78' : '#2F855A'} 
          />
        </Animated.View>

        {/* App Name & Tagline */}
        <View style={styles.textContainer}>
          <Text style={[styles.appName, { color: colors.text }]}>
            CareTrek
          </Text>
          <Text style={[styles.tagline, { color: colors.subtext }]}>
            Your Journey to Better Care
          </Text>
        </View>
      </Animated.View>

      {/* Next Button */}
      <Animated.View 
        style={[
          styles.buttonContainer,
          { 
            opacity: fadeAnim,
            transform: [
              { scale: buttonScale },
              { 
                translateY: buttonPressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 5]
                }) 
              }
            ],
          }
        ]}
      >
        <TouchableOpacity 
          style={[
            styles.nextButton, 
            { 
              backgroundColor: isPressed ? colors.buttonPressed : colors.button,
              ...buttonShadow,
            }
          ]}
          onPress={handleNext}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <Ionicons 
            name="arrow-forward" 
            size={28} 
            color="white" 
          />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    width: '100%',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 52,
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    opacity: 0.9,
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: '80%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  nextButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});

export default WelcomeScreen;
