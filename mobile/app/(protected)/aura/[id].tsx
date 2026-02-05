import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../lib/api';
import { hapticSuccess, hapticMedium } from '../../../lib/haptics';
import AuraOrb from '../../../components/aura/AuraOrb';
import EnergyMeter from '../../../components/aura/EnergyMeter';
import PersonalityCard from '../../../components/aura/PersonalityCard';

interface AuraReading {
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
}

const colorLabels: Record<string, string> = {
  red: 'ENERGETIC',
  orange: 'CREATIVE',
  yellow: 'OPTIMISTIC',
  green: 'BALANCED',
  blue: 'CALM',
  indigo: 'INTUITIVE',
  violet: 'SPIRITUAL',
  white: 'PURE',
  gold: 'ENLIGHTENED',
  pink: 'LOVING',
};

const moodEmojis: Record<number, string> = {
  10: '🌟',
  9: '😊',
  8: '😌',
  7: '🙂',
  6: '😐',
  5: '😔',
};

export default function AuraResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [aura, setAura] = useState<AuraReading | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAura = async () => {
      try {
        const { data } = await api.get(`/aura/${id}`);
        setAura(data);
      } catch (error) {
        Alert.alert('Error', 'Failed to load aura reading');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchAura();
    }
  }, [id]);

  const handleShare = async () => {
    if (!aura) return;

    hapticMedium();

    const label = colorLabels[aura.aura_color] || 'MYSTICAL';
    const shareMessage = `✨ My aura is ${aura.aura_color.toUpperCase()} - ${label}!

🔮 Energy: ${aura.energy_level}%
💫 ${aura.personality}

Discover your aura with AuraSnap! 🌈`;

    try {
      await Share.share({
        message: shareMessage,
      });
      hapticSuccess();
    } catch {
      // User cancelled
    }
  };

  const getMoodEmoji = (score: number): string => {
    if (score >= 9) return '🌟';
    if (score >= 7) return '😊';
    if (score >= 5) return '😌';
    return '😐';
  };

  if (isLoading || !aura) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-950">
        <AuraOrb color="violet" size={100} />
        <Text className="mt-6 text-gray-400">Loading your aura...</Text>
      </SafeAreaView>
    );
  }

  const label = colorLabels[aura.aura_color] || 'MYSTICAL';

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-full bg-gray-800/50 p-2"
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            className="rounded-full bg-gray-800/50 p-2"
          >
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Aura Orb Hero */}
        <View className="mt-8 items-center">
          <AuraOrb color={aura.aura_color} size={180} />
        </View>

        {/* Aura Name */}
        <View className="mt-8 items-center">
          <Text className="text-4xl font-bold uppercase tracking-wider text-white">
            {aura.aura_color}
          </Text>
          <Text className="mt-2 text-lg text-gray-400">{label} AURA</Text>
          {aura.secondary_color && (
            <Text className="mt-1 text-sm text-gray-500">
              with hints of {aura.secondary_color}
            </Text>
          )}
        </View>

        {/* Mood & Energy Row */}
        <View className="mx-6 mt-8 flex-row space-x-4">
          <View className="flex-1 items-center rounded-2xl bg-gray-800/50 p-4">
            <Text className="text-3xl">{getMoodEmoji(aura.mood_score)}</Text>
            <Text className="mt-2 text-sm text-gray-400">Mood</Text>
            <Text className="text-lg font-semibold text-white">
              {aura.mood_score}/10
            </Text>
          </View>
          <View className="w-4" />
          <View className="flex-1 items-center rounded-2xl bg-gray-800/50 p-4">
            <Ionicons name="flash" size={32} color="#8b5cf6" />
            <Text className="mt-2 text-sm text-gray-400">Energy</Text>
            <Text className="text-lg font-semibold text-white">
              {aura.energy_level}%
            </Text>
          </View>
        </View>

        {/* Energy Meter */}
        <View className="mx-6 mt-6">
          <EnergyMeter level={aura.energy_level} color={aura.aura_color} />
        </View>

        {/* Personality Details */}
        <View className="mx-6 mt-8">
          <PersonalityCard
            personality={aura.personality}
            strengths={aura.strengths || []}
            challenges={aura.challenges || []}
            dailyAdvice={aura.daily_advice}
          />
        </View>

        {/* Action Buttons */}
        <View className="mx-6 mt-8 space-y-3">
          <TouchableOpacity
            onPress={handleShare}
            className="flex-row items-center justify-center rounded-full bg-violet-600 py-4"
          >
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text className="ml-2 font-semibold text-white">Share Your Aura</Text>
          </TouchableOpacity>

          <View className="h-3" />

          <TouchableOpacity
            onPress={() => router.push('/match')}
            className="flex-row items-center justify-center rounded-full border border-pink-500 py-4"
          >
            <Ionicons name="people" size={20} color="#ec4899" />
            <Text className="ml-2 font-semibold text-pink-500">
              Compare with Friend
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
