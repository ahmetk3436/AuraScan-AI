import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';

export interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
}

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines,
}: InputProps) {
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <View className="mb-4">
      <Text className="text-gray-300 text-sm font-medium mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`bg-gray-800 border text-white rounded-xl px-4 py-3 text-base ${
          isFocused ? 'border-violet-500' : 'border-gray-700'
        }`}
      />
      <View className="h-1" />
    </View>
  );
}