import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

interface AuraOrbProps {
  color: string;
  size?: number;
}

const colorHex: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  white: '#f8fafc',
  gold: '#fbbf24',
  pink: '#ec4899',
};

export default function AuraOrb({ color, size = 200 }: AuraOrbProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const colorValue = colorHex[color] || colorHex.violet;

  return (
    <View className="items-center justify-center">
      {/* Outer glow */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: size * 0.75,
          backgroundColor: colorValue,
          opacity: glowAnim,
          transform: [{ scale: pulseAnim }],
        }}
      />
      {/* Middle glow */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 1.2,
          height: size * 1.2,
          borderRadius: size * 0.6,
          backgroundColor: colorValue,
          opacity: Animated.add(glowAnim, 0.2),
          transform: [{ scale: pulseAnim }],
        }}
      />
      {/* Core orb */}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorValue,
          transform: [{ scale: pulseAnim }],
          shadowColor: colorValue,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 30,
          elevation: 10,
        }}
      />
    </View>
  );
}
