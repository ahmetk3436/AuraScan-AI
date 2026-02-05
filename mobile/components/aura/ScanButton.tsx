import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, View, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScanButtonProps {
  onPress: () => void;
  isLoading?: boolean;
}

export default function ScanButton({ onPress, isLoading }: ScanButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isLoading]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="items-center">
      {/* Outer glow rings */}
      <Animated.View
        style={{
          opacity: glowAnim,
          transform: [{ scale: pulseAnim }],
        }}
        className="absolute h-48 w-48 rounded-full bg-violet-500/20"
      />
      <Animated.View
        style={{
          opacity: glowAnim,
          transform: [{ scale: Animated.multiply(pulseAnim, 0.85) }],
        }}
        className="absolute h-44 w-44 rounded-full bg-violet-500/30"
      />

      {/* Main button */}
      <TouchableOpacity
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={0.8}
        className="items-center justify-center"
      >
        <Animated.View
          style={{ transform: [{ scale: pulseAnim }] }}
          className="h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br"
        >
          <View className="h-40 w-40 items-center justify-center rounded-full bg-violet-600 shadow-2xl">
            {isLoading ? (
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Ionicons name="sparkles" size={48} color="#fff" />
              </Animated.View>
            ) : (
              <View className="items-center">
                <Ionicons name="scan-outline" size={48} color="#fff" />
                <Text className="mt-2 text-center text-sm font-bold text-white">
                  SCAN
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Label */}
      <Text className="mt-6 text-center text-xl font-bold text-white">
        {isLoading ? 'Reading your energy...' : 'Scan Your Aura'}
      </Text>
      {!isLoading && (
        <Text className="mt-1 text-center text-sm text-gray-400">
          Take a selfie to discover your aura
        </Text>
      )}
    </View>
  );
}
