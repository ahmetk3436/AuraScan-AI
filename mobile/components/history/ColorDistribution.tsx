import React from 'react';
import { View, Text } from 'react-native';

interface ColorDistributionProps {
  distribution: Record<string, number>;
}

const colorMap: Record<string, string> = {
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

export default function ColorDistribution({ distribution }: ColorDistributionProps) {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(distribution), 1);

  if (entries.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-gray-500">No aura data yet</Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl bg-gray-800/50 p-4">
      <Text className="mb-4 font-semibold text-white">Your Aura Colors</Text>
      {entries.map(([color, count]) => (
        <View key={color} className="mb-3">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="capitalize text-gray-300">{color}</Text>
            <Text className="text-gray-400">{count}x</Text>
          </View>
          <View className="h-3 overflow-hidden rounded-full bg-gray-700">
            <View
              style={{ width: `${(count / maxCount) * 100}%` }}
              className={`h-full ${colorMap[color] || 'bg-violet-500'} rounded-full`}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
