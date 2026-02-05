import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PersonalityCardProps {
  personality: string;
  strengths: string[];
  challenges: string[];
  dailyAdvice: string;
}

export default function PersonalityCard({
  personality,
  strengths,
  challenges,
  dailyAdvice,
}: PersonalityCardProps) {
  return (
    <View className="space-y-4">
      {/* Personality */}
      <View className="rounded-2xl bg-gray-800/50 p-4">
        <View className="flex-row items-center">
          <Ionicons name="sparkles" size={20} color="#a78bfa" />
          <Text className="ml-2 font-semibold text-violet-300">Your Energy Profile</Text>
        </View>
        <Text className="mt-3 leading-6 text-white">{personality}</Text>
      </View>

      {/* Strengths */}
      <View className="rounded-2xl bg-gray-800/50 p-4">
        <View className="flex-row items-center">
          <Ionicons name="star" size={20} color="#22c55e" />
          <Text className="ml-2 font-semibold text-green-400">Strengths</Text>
        </View>
        <View className="mt-3">
          {strengths.map((strength, index) => (
            <View key={index} className="mt-2 flex-row items-center">
              <View className="mr-3 h-2 w-2 rounded-full bg-green-500" />
              <Text className="text-gray-300">{strength}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Challenges */}
      <View className="rounded-2xl bg-gray-800/50 p-4">
        <View className="flex-row items-center">
          <Ionicons name="alert-circle" size={20} color="#f59e0b" />
          <Text className="ml-2 font-semibold text-amber-400">Watch Out For</Text>
        </View>
        <View className="mt-3">
          {challenges.map((challenge, index) => (
            <View key={index} className="mt-2 flex-row items-center">
              <View className="mr-3 h-2 w-2 rounded-full bg-amber-500" />
              <Text className="text-gray-300">{challenge}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Daily Advice */}
      <View className="rounded-2xl bg-violet-900/30 p-4">
        <View className="flex-row items-center">
          <Ionicons name="bulb" size={20} color="#c4b5fd" />
          <Text className="ml-2 font-semibold text-violet-300">Today's Advice</Text>
        </View>
        <Text className="mt-3 leading-6 text-gray-200">{dailyAdvice}</Text>
      </View>
    </View>
  );
}
