import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

interface CompatibilityScoreProps {
  score: number;
}

export default function CompatibilityScore({ score }: CompatibilityScoreProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(countAnim, {
        toValue: score,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [score]);

  const getScoreColor = () => {
    if (score >= 80) return '#22c55e'; // Green - great match
    if (score >= 60) return '#f59e0b'; // Amber - good match
    if (score >= 40) return '#f97316'; // Orange - okay match
    return '#ef4444'; // Red - challenging
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Soul Connection!';
    if (score >= 60) return 'Great Synergy';
    if (score >= 40) return 'Interesting Dynamic';
    return 'Challenging Bond';
  };

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }] }}
      className="items-center"
    >
      <View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 8,
          borderColor: getScoreColor(),
          backgroundColor: '#111827',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.Text
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: getScoreColor(),
          }}
        >
          {Math.round(score)}
        </Animated.Text>
        <Text className="text-lg text-white">%</Text>
      </View>
      <Text
        style={{ color: getScoreColor() }}
        className="mt-4 text-lg font-semibold"
      >
        {getScoreLabel()}
      </Text>
    </Animated.View>
  );
}
