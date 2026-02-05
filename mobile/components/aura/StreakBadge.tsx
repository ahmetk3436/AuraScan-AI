import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StreakBadgeProps {
  streak: number;
  totalScans?: number;
}

export default function StreakBadge({ streak, totalScans }: StreakBadgeProps) {
  const flameAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [streak]);

  const getStreakColor = () => {
    if (streak >= 30) return '#f59e0b'; // Gold
    if (streak >= 14) return '#ef4444'; // Red hot
    if (streak >= 7) return '#f97316'; // Orange
    return '#8b5cf6'; // Violet default
  };

  return (
    <View className="mx-4 flex-row items-center justify-between rounded-2xl bg-gray-800/50 px-5 py-4">
      <View className="flex-row items-center">
        <Animated.View style={{ transform: [{ scale: flameAnim }] }}>
          <Ionicons name="flame" size={32} color={getStreakColor()} />
        </Animated.View>
        <View className="ml-3">
          <Text className="text-2xl font-bold text-white">
            {streak} {streak === 1 ? 'Day' : 'Days'}
          </Text>
          <Text className="text-sm text-gray-400">Current Streak</Text>
        </View>
      </View>

      {totalScans !== undefined && (
        <View className="items-end">
          <Text className="text-lg font-semibold text-violet-400">{totalScans}</Text>
          <Text className="text-xs text-gray-500">Total Scans</Text>
        </View>
      )}
    </View>
  );
}
