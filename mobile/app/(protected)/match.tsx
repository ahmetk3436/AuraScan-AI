import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../contexts/AuthContext';
import { hapticSuccess, hapticError, hapticSelection } from '../../lib/haptics';
import api from '../../lib/api';

export default function MatchScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [friendId, setFriendId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Copy User ID
  const handleCopyId = async () => {
    if (!user?.id) return;
    await Clipboard.setStringAsync(user.id);
    setCopied(true);
    hapticSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  // 2. Share User ID
  const handleShareId = async () => {
    if (!user?.id) return;
    hapticSelection();
    try {
      await Share.share({
        message: `Match auras with me on AuraSnap! My ID: ${user.id}`,
      });
    } catch (error) {
      hapticError();
    }
  };

  // 3. Paste from Clipboard
  const handlePaste = async () => {
    hapticSelection();
    const text = await Clipboard.getStringAsync();
    if (text) {
      setFriendId(text.trim());
      // Trigger validation immediately after paste
      validateInput(text.trim());
    }
  };

  // 4. Input Validation
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

  // 5. Handle Input Change
  const handleInputChange = (text: string) => {
    setFriendId(text);
    if (error) validateInput(text);
  };

  // 6. Submit Match
  const handleMatch = async () => {
    if (!validateInput(friendId)) {
      hapticError();
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // API Call logic here
      const response = await api.post('/match', { friendId });
      
      // Simulate network delay (kept for UX smoothness if API is fast, but API call is primary)
      // await new Promise(resolve => setTimeout(resolve, 2000));
      
      hapticSuccess();
      // Navigate to result
      // Assuming response structure matches plan section 8
      const { matchScore, compatibilityType, analysis } = response.data.data;
      router.push({ 
        pathname: '/(protected)/result', 
        params: { score: String(matchScore), type: compatibilityType, analysis: analysis } 
      });
    } catch (err) {
      hapticError();
      setError('Failed to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView 
          contentContainerClassName="p-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-white mb-2">Aura Match</Text>
            <Text className="text-base text-gray-400">Connect with friends to compare energy.</Text>
          </View>

          {/* Your ID Card */}
          <View className="mx-0 mt-4 rounded-2xl bg-gray-800/50 p-5 border border-gray-700/50">
            <View className="flex-row items-center mb-3">
              <Ionicons name="person-circle" size={24} color="#8b5cf6" />
              <Text className="text-sm text-gray-400 ml-2 font-medium">Your ID</Text>
            </View>
            
            <View className="flex-row items-center justify-between bg-gray-900/50 rounded-xl p-3">
              <Text className="text-xs text-white font-mono tracking-wider">
                {user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : 'Loading...'}
              </Text>
              <TouchableOpacity onPress={handleCopyId}>
                <Ionicons 
                  name={copied ? "checkmark-circle" : "copy-outline"} 
                  size={20} 
                  color={copied ? "#10b981" : "#9ca3af"} 
                />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mt-3 text-center leading-4">
              Share this ID with friends so they can match with you
            </Text>

            {/* Share My ID Button */}
            <TouchableOpacity 
              onPress={handleShareId}
              className="flex-row items-center justify-center bg-violet-600/20 rounded-full py-2.5 mt-4 active:opacity-80"
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
                className="absolute right-4 top-1/2 -mt-3 p-1"
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