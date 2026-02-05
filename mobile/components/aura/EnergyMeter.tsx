import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

interface EnergyMeterProps {
  level: number;
  color: string;
}

const colorClasses: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  white: 'bg-gray-200',
  gold: 'bg-amber-400',
  pink: 'bg-pink-500',
};

export default function EnergyMeter({ level, color }: EnergyMeterProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: level,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [level]);

  const bgClass = colorClasses[color] || colorClasses.violet;

  return (
    <View className="w-full">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-400">Energy Level</Text>
        <Text className="text-lg font-bold text-white">{level}%</Text>
      </View>
      <View className="h-4 overflow-hidden rounded-full bg-gray-800">
        <Animated.View
          style={{
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
            height: '100%',
            borderRadius: 999,
          }}
          className={bgClass}
        />
      </View>
      <View className="mt-2 flex-row justify-between">
        <Text className="text-xs text-gray-500">Low</Text>
        <Text className="text-xs text-gray-500">High</Text>
      </View>
    </View>
  );
}
