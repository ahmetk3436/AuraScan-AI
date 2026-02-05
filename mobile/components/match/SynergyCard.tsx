import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SynergyCardProps {
  synergy: string;
  tension: string;
  advice: string;
}

export default function SynergyCard({ synergy, tension, advice }: SynergyCardProps) {
  return (
    <View className="space-y-4">
      {/* Synergy */}
      <View className="rounded-2xl bg-green-900/30 p-4">
        <View className="flex-row items-center">
          <Ionicons name="heart" size={20} color="#22c55e" />
          <Text className="ml-2 font-semibold text-green-400">Your Synergy</Text>
        </View>
        <Text className="mt-3 leading-6 text-gray-200">{synergy}</Text>
      </View>

      {/* Tension */}
      <View className="rounded-2xl bg-amber-900/30 p-4">
        <View className="flex-row items-center">
          <Ionicons name="alert-circle" size={20} color="#f59e0b" />
          <Text className="ml-2 font-semibold text-amber-400">Watch Out For</Text>
        </View>
        <Text className="mt-3 leading-6 text-gray-200">{tension}</Text>
      </View>

      {/* Advice */}
      <View className="rounded-2xl bg-violet-900/30 p-4">
        <View className="flex-row items-center">
          <Ionicons name="bulb" size={20} color="#a78bfa" />
          <Text className="ml-2 font-semibold text-violet-300">Relationship Advice</Text>
        </View>
        <Text className="mt-3 leading-6 text-gray-200">{advice}</Text>
      </View>
    </View>
  );
}
