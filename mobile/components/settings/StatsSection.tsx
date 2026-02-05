import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatsSectionProps {
  currentStreak: number;
  longestStreak: number;
  totalScans: number;
}

export default function StatsSection({
  currentStreak,
  longestStreak,
  totalScans,
}: StatsSectionProps) {
  const flameAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (currentStreak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentStreak]);

  return (
    <View className="rounded-2xl bg-gray-800/50 p-4">
      <Text className="mb-4 font-semibold text-white">Your Stats</Text>

      <View className="flex-row justify-between">
        {/* Current Streak */}
        <View className="flex-1 items-center rounded-xl bg-gray-900/50 p-4">
          <Animated.View style={{ transform: [{ scale: flameAnim }] }}>
            <Ionicons
              name="flame"
              size={32}
              color={currentStreak >= 7 ? '#f59e0b' : '#8b5cf6'}
            />
          </Animated.View>
          <Text className="mt-2 text-2xl font-bold text-white">
            {currentStreak}
          </Text>
          <Text className="text-xs text-gray-400">Day Streak</Text>
        </View>

        <View className="w-3" />

        {/* Longest Streak */}
        <View className="flex-1 items-center rounded-xl bg-gray-900/50 p-4">
          <Ionicons name="trophy" size={32} color="#fbbf24" />
          <Text className="mt-2 text-2xl font-bold text-white">
            {longestStreak}
          </Text>
          <Text className="text-xs text-gray-400">Best Streak</Text>
        </View>

        <View className="w-3" />

        {/* Total Scans */}
        <View className="flex-1 items-center rounded-xl bg-gray-900/50 p-4">
          <Ionicons name="sparkles" size={32} color="#ec4899" />
          <Text className="mt-2 text-2xl font-bold text-white">
            {totalScans}
          </Text>
          <Text className="text-xs text-gray-400">Total Scans</Text>
        </View>
      </View>
    </View>
  );
}
