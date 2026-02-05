import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

interface DualAuraOrbsProps {
  userColor: string;
  friendColor: string;
  compatibilityScore: number;
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

export default function DualAuraOrbs({
  userColor,
  friendColor,
  compatibilityScore,
}: DualAuraOrbsProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const connectionAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(connectionAnim, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(connectionAnim, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const userHex = colorHex[userColor] || colorHex.violet;
  const friendHex = colorHex[friendColor] || colorHex.pink;

  return (
    <View className="items-center">
      <View className="flex-row items-center justify-center">
        {/* User Orb */}
        <View className="items-center">
          <Animated.View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: userHex,
              transform: [{ scale: pulseAnim }],
              shadowColor: userHex,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 20,
            }}
          />
          <Text className="mt-3 text-sm capitalize text-gray-400">You</Text>
          <Text className="text-lg font-semibold capitalize text-white">
            {userColor}
          </Text>
        </View>

        {/* Connection Line */}
        <View className="mx-4 items-center">
          <Animated.View
            style={{
              width: 60,
              height: 4,
              borderRadius: 2,
              opacity: connectionAnim,
              backgroundColor:
                compatibilityScore >= 70 ? '#22c55e' : compatibilityScore >= 50 ? '#f59e0b' : '#ef4444',
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#1f2937',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text className="text-xs">💫</Text>
          </View>
        </View>

        {/* Friend Orb */}
        <View className="items-center">
          <Animated.View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: friendHex,
              transform: [{ scale: pulseAnim }],
              shadowColor: friendHex,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 20,
            }}
          />
          <Text className="mt-3 text-sm capitalize text-gray-400">Friend</Text>
          <Text className="text-lg font-semibold capitalize text-white">
            {friendColor}
          </Text>
        </View>
      </View>
    </View>
  );
}
