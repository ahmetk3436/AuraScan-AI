import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { hapticSuccess, hapticError, hapticSelection } from '../../lib/haptics';
import api from '../../lib/api';

export default function MatchScreen() {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const router = useRouter();
  const [friendId, setFriendId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Copy User ID
  const handleCopyId = async () => {
    if (!user?.id) return;
    await Clipboard.setStringAsync(user.id);
    setCopied(true);
    hapticSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  // Share User ID
  const handleShareId = async () => {
    if (!user?.id) return;
    hapticSelection();
    try {
      await Share.share({
        message: `Match auras with me on AuraSnap! My ID: ${user.id}`,
      });
    } catch (err) {
      hapticError();
    }
  };

  // Paste from Clipboard
  const handlePaste = async () => {
    hapticSelection();
    const text = await Clipboard.getStringAsync();
    if (text) {
      setFriendId(text.trim());
      validateInput(text.trim());
    }
  };

  // Input Validation
  const validateInput = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (id.length > 0 && !uuidRegex.test(id)) {
      setError('Invalid ID format. Please check the UUID.');
      return false;
    } else {
      setError('');
      return true;
    }
  };

  // Handle Input Change
  const handleInputChange = (text: string) => {
    setFriendId(text);
    if (error) validateInput(text);
  };

  // Submit Match
  const handleMatch = async () => {
    // Premium gate
    if (!isSubscribed) {
      hapticError();
      Alert.alert(
        'Premium Feature',
        'Aura compatibility matching is a premium feature.',
        [
          { text: 'Upgrade', onPress: () => router.push('/(protected)/paywall') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (!validateInput(friendId)) {
      hapticError();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/match', { friend_id: friendId });
      hapticSuccess();

      const { compatibility_score, synergy, advice } = response.data;
      Alert.alert(
        `Compatibility: ${compatibility_score}%`,
        `${synergy}\n\n${advice}`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      hapticError();
      setError('Failed to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-white mb-2">Aura Match</Text>
            <Text className="text-base text-gray-400">Connect with friends to compare energy.</Text>
          </View>

          {/* Premium Lock Overlay */}
          {!isSubscribed && (
            <View className="bg-violet-900/20 rounded-2xl p-5 items-center border border-violet-500/20 mb-6">
              <Ionicons name="lock-closed" size={28} color="#a78bfa" />
              <Text className="text-white font-bold text-lg mt-2">Premium Feature</Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                Upgrade to compare aura compatibility with friends
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(protected)/paywall')}
                className="bg-violet-600 rounded-full px-6 py-3 mt-4"
              >
                <Text className="text-white font-bold">Unlock</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Your ID Card */}
          <View className="rounded-2xl bg-gray-800/50 p-5 border border-gray-700/50">
            <View className="flex-row items-center mb-3">
              <Ionicons name="person-circle" size={24} color="#8b5cf6" />
              <Text className="text-sm text-gray-400 ml-2 font-medium">Your ID</Text>
            </View>

            <View className="flex-row items-center justify-between bg-gray-900/50 rounded-xl p-3">
              <Text className="text-xs text-white" style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                {user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : 'Loading...'}
              </Text>
              <TouchableOpacity onPress={handleCopyId}>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={20}
                  color={copied ? '#10b981' : '#9ca3af'}
                />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mt-3 text-center leading-4">
              Share this ID with friends so they can match with you
            </Text>

            {/* Share My ID Button */}
            <TouchableOpacity
              onPress={handleShareId}
              className="flex-row items-center justify-center bg-violet-600/20 rounded-full py-2.5 mt-4"
            >
              <Ionicons name="share-outline" size={16} color="#8b5cf6" />
              <Text className="text-sm font-semibold text-violet-400 ml-2">Share My ID</Text>
            </TouchableOpacity>
          </View>

          {/* Friend ID Input Section */}
          <View className="mt-8">
            <Text className="text-sm font-semibold text-gray-300 mb-3 ml-1">Friend's ID</Text>
            <View className="relative">
              <TextInput
                className={`w-full bg-gray-800 text-white rounded-xl p-4 pr-12 text-base border ${error ? 'border-red-500' : 'border-transparent'}`}
                placeholder="Paste friend's UUID here"
                placeholderTextColor="#6b7280"
                value={friendId}
                onChangeText={handleInputChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={handlePaste}
                className="absolute right-4 top-4 p-1"
              >
                <Ionicons name="clipboard-outline" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            {error ? (
              <Text className="text-xs text-red-400 mt-2 ml-1">{error}</Text>
            ) : null}
          </View>

          {/* Match Button */}
          <TouchableOpacity
            onPress={handleMatch}
            disabled={!friendId || isLoading}
            className={`w-full rounded-2xl py-4 mt-8 flex-row items-center justify-center ${(!friendId || isLoading) ? 'bg-gray-800' : 'bg-violet-600'}`}
          >
            <Text className={`text-base font-bold ${(!friendId || isLoading) ? 'text-gray-500' : 'text-white'}`}>
              Start Matching
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Loading Overlay */}
        {isLoading && (
          <View className="absolute inset-0 bg-black/80 z-50 flex-col items-center justify-center">
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text className="text-white text-base font-medium mt-4">Analyzing compatibility...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
