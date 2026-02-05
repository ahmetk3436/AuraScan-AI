import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticMedium } from '../../lib/haptics';
import DualAuraOrbs from '../../components/match/DualAuraOrbs';
import CompatibilityScore from '../../components/match/CompatibilityScore';
import SynergyCard from '../../components/match/SynergyCard';

interface MatchResult {
  id: string;
  compatibility_score: number;
  synergy: string;
  tension: string;
  advice: string;
  user_aura_color: string;
  friend_aura_color: string;
}

export default function MatchScreen() {
  const router = useRouter();
  const [friendId, setFriendId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const handleMatch = async () => {
    if (!friendId.trim()) {
      Alert.alert('Enter Friend ID', 'Please enter your friend\'s user ID to compare auras.');
      return;
    }

    setIsLoading(true);
    hapticMedium();

    try {
      const { data } = await api.post('/aura/match', {
        friend_id: friendId.trim(),
      });

      setMatchResult(data);
      hapticSuccess();
    } catch (error: any) {
      hapticError();
      const message = error.response?.data?.message || 'Failed to calculate match';
      Alert.alert('Match Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!matchResult) return;

    hapticMedium();

    const shareMessage = `💫 Our Aura Compatibility: ${matchResult.compatibility_score}%!

My aura: ${matchResult.user_aura_color.toUpperCase()}
Their aura: ${matchResult.friend_aura_color.toUpperCase()}

${matchResult.synergy}

Discover your aura compatibility with AuraSnap! 🌈`;

    try {
      await Share.share({ message: shareMessage });
      hapticSuccess();
    } catch {
      // User cancelled
    }
  };

  const resetMatch = () => {
    setMatchResult(null);
    setFriendId('');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center px-4 pt-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-full bg-gray-800/50 p-2"
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="ml-4 text-2xl font-bold text-white">
              Aura Compatibility
            </Text>
          </View>

          {matchResult ? (
            // Results View
            <>
              {/* Dual Orbs */}
              <View className="mt-8">
                <DualAuraOrbs
                  userColor={matchResult.user_aura_color}
                  friendColor={matchResult.friend_aura_color}
                  compatibilityScore={matchResult.compatibility_score}
                />
              </View>

              {/* Compatibility Score */}
              <View className="mt-8 items-center">
                <CompatibilityScore score={matchResult.compatibility_score} />
              </View>

              {/* Synergy Details */}
              <View className="mx-6 mt-8">
                <SynergyCard
                  synergy={matchResult.synergy}
                  tension={matchResult.tension}
                  advice={matchResult.advice}
                />
              </View>

              {/* Action Buttons */}
              <View className="mx-6 mt-8 space-y-3">
                <TouchableOpacity
                  onPress={handleShare}
                  className="flex-row items-center justify-center rounded-full bg-pink-600 py-4"
                >
                  <Ionicons name="share-social" size={20} color="#fff" />
                  <Text className="ml-2 font-semibold text-white">
                    Share Match
                  </Text>
                </TouchableOpacity>

                <View className="h-3" />

                <TouchableOpacity
                  onPress={resetMatch}
                  className="flex-row items-center justify-center rounded-full border border-gray-600 py-4"
                >
                  <Ionicons name="refresh" size={20} color="#9ca3af" />
                  <Text className="ml-2 font-semibold text-gray-400">
                    Find Another Friend
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Input View
            <>
              <View className="mx-6 mt-12 items-center">
                <View className="h-32 w-32 items-center justify-center rounded-full bg-pink-500/20">
                  <Ionicons name="people" size={64} color="#ec4899" />
                </View>
                <Text className="mt-6 text-center text-xl font-semibold text-white">
                  Compare Auras with a Friend
                </Text>
                <Text className="mt-2 text-center text-gray-400">
                  Enter your friend's user ID to see your aura compatibility
                </Text>
              </View>

              {/* Friend ID Input */}
              <View className="mx-6 mt-8">
                <Text className="mb-2 text-sm text-gray-400">Friend's User ID</Text>
                <TextInput
                  value={friendId}
                  onChangeText={setFriendId}
                  placeholder="e.g., a1b2c3d4-e5f6-..."
                  placeholderTextColor="#6b7280"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-xl bg-gray-800 px-4 py-4 text-white"
                />
              </View>

              {/* Match Button */}
              <View className="mx-6 mt-6">
                <TouchableOpacity
                  onPress={handleMatch}
                  disabled={isLoading}
                  className="flex-row items-center justify-center rounded-full bg-pink-600 py-4"
                >
                  {isLoading ? (
                    <Text className="font-semibold text-white">
                      Calculating...
                    </Text>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={20} color="#fff" />
                      <Text className="ml-2 font-semibold text-white">
                        Calculate Compatibility
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Info Card */}
              <View className="mx-6 mt-10 rounded-2xl bg-gray-800/50 p-5">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={24} color="#8b5cf6" />
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold text-violet-300">
                      How it works
                    </Text>
                    <Text className="mt-2 text-sm leading-5 text-gray-300">
                      Aura compatibility is calculated by comparing your most recent aura
                      readings. Same colors create deep connections, while complementary
                      colors balance each other perfectly.
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
