import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/colors';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  duration = 3000 
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0.5)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo animation: scale up and fade in
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Rotating animation (continuous)
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Call onFinish after duration
    const timer = setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onFinish?.();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onFinish, scaleAnim, opacityAnim, rotateAnim]);

  const spinValue = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Background gradient effect */}
      <View style={styles.innerContainer}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: scaleAnim },
                { rotate: spinValue },
              ],
            },
          ]}
        >
          <View style={styles.logoBox}>
            {/* McDave Green Circle */}
            <View style={[styles.logoPart, styles.greenPart]} />
            {/* McDave Gold Arc */}
            <View style={[styles.logoPart, styles.goldPart]} />
            {/* Center dots */}
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
              <View style={[styles.dot, styles.dot4]} />
            </View>
          </View>
        </Animated.View>

        {/* Brand name with color split */}
        <Text style={styles.brandName}>
          <Text style={{ color: Colors.primary }}>Mc</Text>
          <Text style={{ color: Colors.accent }}>Dave</Text>
        </Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Order Management System</Text>

        {/* Loading indicator */}
        <View style={styles.loaderContainer}>
          <View style={styles.loaderDot} />
          <View style={[styles.loaderDot, { marginLeft: 8 }]} />
          <View style={[styles.loaderDot, { marginLeft: 8 }]} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoBox: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoPart: {
    position: 'absolute',
    borderWidth: 8,
  },
  greenPart: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor: Colors.primary,
    left: 10,
    top: 10,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  goldPart: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor: Colors.accent,
    right: 10,
    bottom: 10,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray500,
  },
  dot1: {
    backgroundColor: Colors.primary,
  },
  dot2: {
    backgroundColor: Colors.accent,
  },
  dot3: {
    backgroundColor: Colors.primary,
  },
  dot4: {
    backgroundColor: Colors.gray500,
  },
  brandName: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    fontStyle: 'italic',
  },
  loaderContainer: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
  loaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },
});

export default SplashScreen;
