import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Reading {
  id: string;
  aura_color: string;
  energy_level: number;
  mood_score: number;
  created_at: string;
}

interface ReadingListProps {
  readings: Reading[];
  onSelect: (id: string) => void;
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

export default function ReadingList({ readings, onSelect }: ReadingListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: Reading }) => {
    const bgClass = colorMap[item.aura_color] || 'bg-violet-500';

    return (
      <TouchableOpacity
        onPress={() => onSelect(item.id)}
        className="mb-3 flex-row items-center rounded-xl bg-gray-800/50 p-4"
      >
        <View className={`h-12 w-12 items-center justify-center rounded-full ${bgClass}`}>
          <Ionicons name="sparkles" size={20} color="#fff" />
        </View>
        <View className="ml-4 flex-1">
          <Text className="capitalize font-semibold text-white">
            {item.aura_color} Aura
          </Text>
          <Text className="text-sm text-gray-400">{formatDate(item.created_at)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-violet-400">{item.energy_level}%</Text>
          <Text className="text-xs text-gray-500">energy</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (readings.length === 0) {
    return (
      <View className="items-center py-12">
        <Ionicons name="sparkles-outline" size={48} color="#6b7280" />
        <Text className="mt-4 text-lg font-semibold text-gray-400">No readings yet</Text>
        <Text className="mt-1 text-sm text-gray-500">
          Take your first aura scan to begin!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={readings}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
    />
  );
}
