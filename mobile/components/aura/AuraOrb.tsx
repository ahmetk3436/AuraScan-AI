import React from 'react';
import { View, Text } from 'react-native';
import { colorMap } from '../../utils/constants';

interface AuraOrbProps {
  colorName: string;
  size: number;
  label?: string;
}

export default function AuraOrb({ colorName, size, label }: AuraOrbProps) {
  const colorHex = colorMap[colorName as keyof typeof colorMap] || '#a855f7';

  return (
    <View className="flex-col items-center justify-center">
      {/* The Orb Visualization */}
      <View 
        className="rounded-full shadow-2xl"
        style={{ 
          width: size, 
          height: size, 
          backgroundColor: colorHex,
          shadowColor: colorHex,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 10
        }}
      >
        {/* Inner Glow Effect */}
        <View 
          className="absolute inset-4 rounded-full opacity-50 blur-xl"
          style={{ backgroundColor: 'white' }}
        />
      </View>

      {/* Optional Label */}
      {label && (
        <Text className="text-sm font-medium text-gray-300 mt-3 text-center">
          {label}
        </Text>
      )}
    </View>
  );
}