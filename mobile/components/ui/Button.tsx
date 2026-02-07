import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { hapticLight } from '../../lib/haptics';

interface ButtonProps {
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  children: React.ReactNode;
  className?: string;
}

export default function Button({
  onPress,
  disabled = false,
  variant = 'primary',
  children,
  className = '',
}: ButtonProps) {
  const handlePress = () => {
    if (!disabled) {
      hapticLight();
      onPress();
    }
  };

  const baseStyle = "rounded-xl py-4 flex-row justify-center items-center";
  const variantStyles: Record<string, string> = {
    primary: "bg-violet-600 active:bg-violet-700",
    secondary: "bg-gray-800 active:bg-gray-700",
    outline: "border border-gray-600 active:bg-gray-800",
    destructive: "bg-red-600 active:bg-red-700",
  };
  const disabledStyle = "opacity-50";
  const textStyle = "text-white text-base font-semibold";

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={`${baseStyle} ${variantStyles[variant] || variantStyles.primary} ${disabled ? disabledStyle : ''} ${className}`}
    >
      {typeof children === 'string' ? (
        <Text className={textStyle}>{children}</Text>
      ) : (
        <View className="flex-row justify-center items-center">
          {children}
        </View>
      )}
    </Pressable>
  );
}