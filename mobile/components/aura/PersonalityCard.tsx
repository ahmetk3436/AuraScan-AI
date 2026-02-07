import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface PersonalityCardProps {
  traits: string[];
  description: string;
}

export default function PersonalityCard({ traits, description }: PersonalityCardProps) {
  return (
    <View className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <Text className="text-base text-gray-300 leading-relaxed mb-4">
        {description}
      </Text>
      
      <View className="flex-row flex-wrap gap-2">
        {traits.map((trait, index) => (
          <View 
            key={index} 
            className="bg-gray-800 rounded-full px-3 py-1.5 border border-gray-700"
          >
            <Text className="text-sm font-medium text-purple-400 capitalize">
              {trait}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}