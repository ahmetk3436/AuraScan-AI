import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuraCardProps {
  auraColor: string;
  energyLevel: number;
  personality: string;
  onPress?: () => void;
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500' },
  green: { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-500' },
  white: { bg: 'bg-white', text: 'text-gray-700', border: 'border-gray-300' },
  gold: { bg: 'bg-amber-400', text: 'text-amber-500', border: 'border-amber-400' },
  pink: { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500' },
};

const colorLabels: Record<string, string> = {
  red: 'Energetic',
  orange: 'Creative',
  yellow: 'Optimistic',
  green: 'Balanced',
  blue: 'Calm',
  indigo: 'Intuitive',
  violet: 'Spiritual',
  white: 'Pure',
  gold: 'Enlightened',
  pink: 'Loving',
};

export default function AuraCard({ auraColor, energyLevel, personality, onPress }: AuraCardProps) {
  const colors = colorMap[auraColor] || colorMap.violet;
  const label = colorLabels[auraColor] || 'Mystical';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className={`mx-4 overflow-hidden rounded-3xl border-2 ${colors.border} bg-gray-900`}
    >
      {/* Aura color header */}
      <View className={`${colors.bg} px-6 py-4`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-white/30">
              <Ionicons name="sparkles" size={24} color="#fff" />
            </View>
            <View>
              <Text className="text-lg font-bold uppercase text-white">
                {auraColor} Aura
              </Text>
              <Text className="text-sm text-white/80">{label}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </View>
      </View>

      {/* Energy level */}
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-400">Energy Level</Text>
          <Text className={`text-xl font-bold ${colors.text}`}>{energyLevel}%</Text>
        </View>
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
          <View
            style={{ width: `${energyLevel}%` }}
            className={`h-full ${colors.bg} rounded-full`}
          />
        </View>
      </View>

      {/* Personality snippet */}
      <View className="border-t border-gray-800 px-6 py-4">
        <Text className="text-sm text-gray-300">Your Energy Today</Text>
        <Text className="mt-1 text-base text-white" numberOfLines={2}>
          {personality}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
