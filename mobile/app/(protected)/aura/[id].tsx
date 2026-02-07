import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import api from '../../../lib/api';
import { hapticMedium, hapticSuccess, hapticSelection } from '../../../lib/haptics';
import { colorMap } from '../../../utils/constants';

const AURA_COLORS: Record<string, { hex: string; emoji: string }> = {
  'Red': { hex: '#dc2626', emoji: '' },
  'Orange': { hex: '#ea580c', emoji: '' },
  'Yellow': { hex: '#eab308', emoji: '' },
  'Green': { hex: '#16a34a', emoji: '' },
  'Blue': { hex: '#2563eb', emoji: '' },
  'Indigo': { hex: '#4f46e5', emoji: '' },
  'Violet': { hex: '#7c3aed', emoji: '' },
  'Pink': { hex: '#ec4899', emoji: '' },
  'Turquoise': { hex: '#06b6d4', emoji: '' },
  'Gold': { hex: '#f59e0b', emoji: '' },
};

function getColorHex(colorName: string): string {
  for (const [key, val] of Object.entries(AURA_COLORS)) {
    if (colorName?.toLowerCase().includes(key.toLowerCase())) return val.hex;
  }
  // fallback to colorMap
  const mapped = colorMap[colorName as keyof typeof colorMap];
  if (mapped) return mapped;
  return '#7c3aed';
}

interface AuraData {
  id: string;
  aura_color: string;
  secondary_color?: string;
  energy_level: number;
  mood_score: number;
  personality: string;
  strengths: string[];
  challenges: string[];
  daily_advice: string;
  analyzed_at: string;
  created_at: string;
}

export default function AuraResultScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [auraData, setAuraData] = useState<AuraData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Typewriter state
  const [displayedChars, setDisplayedChars] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  // Animation values
  const orbScale = useSharedValue(0);
  const orbY = useSharedValue(-50);
  const contentOpacity = useSharedValue(0);

  // Particle animations
  const particleAnims = useRef(
    Array.from({ length: 10 }, () => ({
      transX: useSharedValue(0),
      transY: useSharedValue(0),
      opacity: useSharedValue(0),
      scale: useSharedValue(1),
    }))
  ).current;

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: orbScale.value },
      { translateY: orbY.value },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { translateY: interpolate(contentOpacity.value, [0, 1], [20, 0]) },
    ],
  }));

  const triggerReveal = (colorName: string) => {
    hapticMedium();

    // Orb entrance
    orbScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    orbY.value = withSpring(0, { damping: 15 });

    // Content fade in
    contentOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));

    // Delayed haptic
    setTimeout(() => hapticSuccess(), 600);

    // Typewriter
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < colorName.length) {
        setDisplayedChars((prev) => prev + 1);
        index++;
      } else {
        clearInterval(typeInterval);
        setShowCursor(false);
      }
    }, 50);

    // Cursor blink
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    setTimeout(() => clearInterval(cursorInterval), colorName.length * 50 + 500);

    // Particle explosion
    particleAnims.forEach((p) => {
      const destX = (Math.random() - 0.5) * 200;
      const destY = (Math.random() - 0.5) * 200;
      p.opacity.value = 1;
      p.scale.value = 1;
      p.transX.value = withTiming(destX, { duration: 1500, easing: Easing.out(Easing.quad) });
      p.transY.value = withTiming(destY, { duration: 1500, easing: Easing.out(Easing.quad) });
      p.opacity.value = withTiming(0, { duration: 1500 });
      p.scale.value = withTiming(0, { duration: 1500 });
    });
  };

  useEffect(() => {
    const fetchAura = async () => {
      try {
        const { data } = await api.get(`/aura/${id}`);
        setAuraData(data);
        setIsLoading(false);
        triggerReveal(data.aura_color);
      } catch (err) {
        console.error('Failed to fetch aura:', err);
        setError('Could not load aura reading');
        setIsLoading(false);
      }
    };

    fetchAura();
  }, [id]);

  const handleShare = async () => {
    if (!auraData) return;
    hapticSelection();
    const personality = auraData.personality.length > 100
      ? auraData.personality.substring(0, 100) + '...'
      : auraData.personality;
    try {
      await Share.share({
        message: `My AuraSnap Reading\n\n${auraData.aura_color} Aura\nEnergy: ${auraData.energy_level}% | Mood: ${auraData.mood_score}/10\n\n${personality}\n\nDownload AuraSnap to discover YOUR aura!`,
      });
    } catch (err) {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-gray-400 mt-4">Loading your aura...</Text>
      </SafeAreaView>
    );
  }

  if (error || !auraData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text className="text-white text-lg font-bold mt-4">{error || 'Something went wrong'}</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 bg-gray-800 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const primaryHex = getColorHex(auraData.aura_color);
  const secondaryHex = auraData.secondary_color ? getColorHex(auraData.secondary_color) : null;

  const particleColors = [primaryHex, secondaryHex || '#ffffff', '#ffffff'];

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Back Button */}
      <Pressable
        onPress={() => {
          hapticSelection();
          router.back();
        }}
        className="absolute top-14 left-4 z-50 w-10 h-10 rounded-full bg-gray-800/80 items-center justify-center"
      >
        <Ionicons name="arrow-back" size={20} color="#ffffff" />
      </Pressable>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Particle Layer */}
        <View className="items-center mt-16 mb-4" style={{ height: 220 }}>
          {particleAnims.map((p, i) => {
            const animStyle = useAnimatedStyle(() => ({
              transform: [
                { translateX: p.transX.value },
                { translateY: p.transY.value },
                { scale: p.scale.value },
              ],
              opacity: p.opacity.value,
            }));
            return (
              <Animated.View
                key={i}
                className="absolute rounded-full"
                style={[
                  {
                    width: 8,
                    height: 8,
                    backgroundColor: particleColors[i % particleColors.length],
                    top: 100,
                    left: '50%',
                    marginLeft: -4,
                  },
                  animStyle,
                ]}
              />
            );
          })}

          {/* Animated Orb */}
          <Animated.View style={orbAnimatedStyle} className="items-center">
            <View
              className="rounded-full items-center justify-center"
              style={{
                width: 160,
                height: 160,
                backgroundColor: primaryHex,
                shadowColor: primaryHex,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 30,
                elevation: 10,
              }}
            >
              <View
                className="absolute rounded-full opacity-40"
                style={{
                  width: 120,
                  height: 120,
                  backgroundColor: '#ffffff',
                }}
              />
              <Ionicons name="sparkles" size={40} color="rgba(255,255,255,0.8)" />
            </View>
          </Animated.View>
        </View>

        {/* Content - fades in after orb */}
        <Animated.View style={contentAnimatedStyle}>
          {/* Typewriter Color Name */}
          <View className="flex-row items-center justify-center mb-2">
            <Text className="text-3xl font-bold text-white tracking-wider">
              {auraData.aura_color.substring(0, displayedChars)}
            </Text>
            {showCursor && (
              <Text className="text-3xl font-bold text-white ml-0.5">|</Text>
            )}
          </View>

          {/* Secondary Color Badge */}
          {secondaryHex && auraData.secondary_color && (
            <View className="items-center mb-4">
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: secondaryHex + '33' }}
              >
                <Text className="text-xs font-medium" style={{ color: secondaryHex }}>
                  Secondary: {auraData.secondary_color}
                </Text>
              </View>
            </View>
          )}

          {/* Stats Row */}
          <View className="flex-row mx-6 mt-4 mb-6">
            <View className="flex-1 items-center rounded-xl bg-gray-800/50 p-4 mr-2">
              <Ionicons name="flash" size={24} color="#f59e0b" />
              <Text className="text-2xl font-bold text-white mt-1">{auraData.energy_level}%</Text>
              <Text className="text-xs text-gray-400">Energy</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-gray-800/50 p-4 ml-2">
              <Text className="text-2xl">{auraData.mood_score >= 7 ? '\u{1F60A}' : '\u{1F60C}'}</Text>
              <Text className="text-2xl font-bold text-white mt-1">{auraData.mood_score}/10</Text>
              <Text className="text-xs text-gray-400">Mood</Text>
            </View>
          </View>

          {/* Personality */}
          <View className="mx-6 border-t border-gray-800 pt-6">
            <Text className="text-lg font-bold text-white mb-3">Personality</Text>
            <Text className="text-base text-gray-300 leading-6">{auraData.personality}</Text>
          </View>

          {/* Strengths */}
          {auraData.strengths && auraData.strengths.length > 0 && (
            <View className="mx-6 mt-6">
              <Text className="text-lg font-bold text-white mb-3">Strengths</Text>
              <View className="flex-row flex-wrap">
                {auraData.strengths.map((s, i) => (
                  <View
                    key={i}
                    className="bg-green-500/10 rounded-full px-3 py-1.5 mr-2 mb-2"
                  >
                    <Text className="text-green-400 text-sm">{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Challenges */}
          {auraData.challenges && auraData.challenges.length > 0 && (
            <View className="mx-6 mt-6">
              <Text className="text-lg font-bold text-white mb-3">Growth Areas</Text>
              <View className="flex-row flex-wrap">
                {auraData.challenges.map((ch, i) => (
                  <View
                    key={i}
                    className="bg-amber-500/10 rounded-full px-3 py-1.5 mr-2 mb-2"
                  >
                    <Text className="text-amber-400 text-sm">{ch}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Daily Advice */}
          {auraData.daily_advice && (
            <View className="mx-6 mt-6 bg-violet-900/20 rounded-2xl p-5 border border-violet-500/20">
              <View className="flex-row items-center mb-2">
                <Ionicons name="bulb" size={20} color="#a78bfa" />
                <Text className="text-violet-300 font-semibold ml-2">Daily Guidance</Text>
              </View>
              <Text className="text-gray-300 text-sm leading-5">{auraData.daily_advice}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="mx-6 mt-8 gap-3">
            <Pressable
              onPress={handleShare}
              className="bg-white rounded-2xl p-4 flex-row items-center justify-center"
            >
              <Ionicons name="share-outline" size={22} color="#000" />
              <Text className="ml-2 font-bold text-black text-base">Share Result</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticSelection();
                router.push('/(protected)/match');
              }}
              className="bg-pink-600 rounded-2xl p-4 flex-row items-center justify-center"
            >
              <Ionicons name="people" size={22} color="white" />
              <Text className="ml-2 font-bold text-white text-base">Compare with Friend</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace('/(protected)/home')}
              className="border border-gray-700 rounded-2xl p-4 flex-row items-center justify-center"
            >
              <Text className="font-semibold text-white text-base">Scan Again</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
