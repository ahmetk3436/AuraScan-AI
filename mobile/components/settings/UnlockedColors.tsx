import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UnlockedColorsProps {
  unlocked: string[];
  currentStreak: number;
}

const allColors = [
  { name: 'silver', hex: '#94a3b8', unlockAt: 3 },
  { name: 'gold', hex: '#fbbf24', unlockAt: 7 },
  { name: 'white', hex: '#f8fafc', unlockAt: 14 },
  { name: 'rainbow', hex: '#8b5cf6', unlockAt: 21 },
  { name: 'cosmic', hex: '#3b82f6', unlockAt: 30 },
  { name: 'celestial', hex: '#ec4899', unlockAt: 50 },
];

export default function UnlockedColors({ unlocked, currentStreak }: UnlockedColorsProps) {
  return (
    <View className="rounded-2xl bg-gray-800/50 p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-semibold text-white">Rare Aura Colors</Text>
        <Text className="text-xs text-gray-400">Unlock with streaks</Text>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {allColors.map((color) => {
          const isUnlocked = unlocked.includes(color.name);
          const canUnlockSoon = !isUnlocked && currentStreak >= color.unlockAt - 3;

          return (
            <View key={color.name} className="mb-4 w-[30%] items-center">
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: isUnlocked ? color.hex : '#374151',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isUnlocked ? 1 : 0.5,
                }}
              >
                {isUnlocked ? (
                  <Ionicons name="sparkles" size={24} color={color.name === 'white' ? '#6b7280' : '#fff'} />
                ) : (
                  <Ionicons name="lock-closed" size={20} color="#6b7280" />
                )}
              </View>
              <Text
                className={`mt-2 text-xs capitalize ${
                  isUnlocked ? 'text-white' : 'text-gray-500'
                }`}
              >
                {color.name}
              </Text>
              {!isUnlocked && (
                <Text className="text-[10px] text-gray-600">
                  {color.unlockAt}d streak
                </Text>
              )}
              {canUnlockSoon && !isUnlocked && (
                <Text className="text-[10px] text-violet-400">Almost!</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
