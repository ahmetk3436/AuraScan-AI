import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Share, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticSelection, hapticMedium } from '../../lib/haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';

const AURA_COLORS: Record<string, { gradient: [string, string]; emoji: string }> = {
  'Red': { gradient: ['#dc2626', '#991b1b'], emoji: '' },
  'Orange': { gradient: ['#ea580c', '#c2410c'], emoji: '' },
  'Yellow': { gradient: ['#eab308', '#a16207'], emoji: '' },
  'Green': { gradient: ['#16a34a', '#15803d'], emoji: '' },
  'Blue': { gradient: ['#2563eb', '#1d4ed8'], emoji: '' },
  'Indigo': { gradient: ['#4f46e5', '#4338ca'], emoji: '' },
  'Violet': { gradient: ['#7c3aed', '#6d28d9'], emoji: '' },
  'Pink': { gradient: ['#ec4899', '#db2777'], emoji: '' },
  'Turquoise': { gradient: ['#06b6d4', '#0891b2'], emoji: '' },
  'Gold': { gradient: ['#f59e0b', '#d97706'], emoji: '' },
};

function getAuraGradient(title: string): [string, string] {
  for (const [key, val] of Object.entries(AURA_COLORS)) {
    if (title?.toLowerCase().includes(key.toLowerCase())) return val.gradient;
  }
  return ['#7c3aed', '#4f46e5'];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isGuest, isAuthenticated, guestUsageCount, canUseFeature, incrementGuestUsage } = useAuth();
  const { isSubscribed } = useSubscription();
  const [result, setResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [todayScanCount, setTodayScanCount] = useState(0);

  // Animations
  const orbPulse = useSharedValue(1);
  const orbGlow = useSharedValue(0.3);
  const resultScale = useSharedValue(0);
  const loadingPulse = useSharedValue(0.4);

  useEffect(() => {
    // Breathing pulse animation for scan button
    orbPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orbGlow.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );
    loadingPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbPulse.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: orbGlow.value,
  }));

  const resultAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultScale.value,
  }));

  const handleScan = async () => {
    hapticSelection();

    // Check guest limits
    if (isGuest && !canUseFeature()) {
      hapticError();
      Alert.alert(
        'Free Scans Used',
        'You\'ve used all 3 free scans. Create an account to unlock unlimited scans!',
        [
          { text: 'Sign Up', onPress: () => router.push('/(auth)/register') },
          { text: 'Later', style: 'cancel' },
        ]
      );
      return;
    }

    // Check authenticated user daily limit
    if (isAuthenticated && !isSubscribed && todayScanCount >= 2) {
      hapticError();
      Alert.alert(
        'Daily Limit Reached',
        'Free users get 2 scans per day. Upgrade to Premium for unlimited scans!',
        [
          { text: 'Upgrade', onPress: () => router.push('/(protected)/paywall') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      hapticError();
      Alert.alert('Permission Needed', 'We need access to your photos to scan your aura.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (pickerResult.canceled) return;

    setIsScanning(true);
    setResult(null);
    resultScale.value = 0;

    try {
      const base64 = await FileSystem.readAsStringAsync(pickerResult.assets[0].uri, {
        encoding: 'base64' as any,
      });

      const response = await api.post('/aura/scan', { image_data: base64 });

      const scanResult = {
        id: response.data.id || Date.now(),
        date: new Date().toLocaleDateString(),
        title: response.data.aura_color || 'Unknown',
        description: response.data.personality || '',
        energy_level: response.data.energy_level,
        mood_score: response.data.mood_score,
        ...response.data,
      };

      setResult(scanResult);
      setHistory((prev) => [scanResult, ...prev].slice(0, 10));
      setTodayScanCount((prev) => prev + 1);

      // Animate result card in
      resultScale.value = withSpring(1, { damping: 12, stiffness: 100 });

      // Track guest usage
      if (isGuest) {
        await incrementGuestUsage();
      }

      hapticSuccess();
    } catch (err) {
      hapticError();
      Alert.alert('Scan Failed', 'Could not analyze your aura. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    hapticSelection();
    try {
      await Share.share({
        message: `My aura is ${result.title}! Discover yours with AuraSnap.`,
      });
    } catch {
      // ignore
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Could refresh streak, scan count, etc.
    try {
      if (isAuthenticated) {
        const { data } = await api.get('/aura/scan/check');
        setTodayScanCount(2 - (data.remaining || 0));
      }
    } catch {
      // ignore
    }
    setRefreshing(false);
  };

  const remainingScans = isGuest ? Math.max(0, 3 - guestUsageCount) : null;
  const greeting = user?.email?.split('@')[0] || 'Explorer';

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold text-white">AuraSnap</Text>
            <Text className="text-sm text-gray-400 mt-0.5">
              {isGuest ? 'Guest Mode' : `${getGreeting()}, ${greeting}`}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              hapticSelection();
              router.push('/(protected)/settings');
            }}
            className="w-10 h-10 rounded-full bg-gray-800/80 items-center justify-center"
          >
            <Ionicons name="person-outline" size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Guest Usage Banner */}
        {isGuest && (
          <View className="mx-6 mt-2 bg-violet-900/30 border border-violet-500/20 rounded-2xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Ionicons name="sparkles" size={18} color="#a78bfa" />
              <Text className="text-violet-300 text-sm ml-2 flex-1">
                {remainingScans! > 0
                  ? `${remainingScans} free scan${remainingScans === 1 ? '' : 's'} remaining`
                  : 'No free scans left'}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              className="bg-violet-600 px-3 py-1.5 rounded-full"
            >
              <Text className="text-white text-xs font-semibold">Sign Up</Text>
            </Pressable>
          </View>
        )}

        {/* Scan Area */}
        <View className="items-center py-12">
          {/* Glow Effect */}
          <Animated.View
            style={glowAnimatedStyle}
            className="absolute w-48 h-48 rounded-full bg-violet-500/20"
          />

          {/* Scan Orb */}
          <Animated.View style={orbAnimatedStyle}>
            <Pressable
              onPress={handleScan}
              disabled={isScanning}
              className="w-40 h-40 rounded-full items-center justify-center overflow-hidden"
            >
              <LinearGradient
                colors={isScanning ? ['#374151', '#1f2937'] : ['#7c3aed', '#ec4899']}
                className="w-full h-full items-center justify-center"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isScanning ? (
                  <ActivityIndicator size="large" color="#a78bfa" />
                ) : (
                  <View className="items-center">
                    <Ionicons name="camera" size={40} color="white" />
                    <Text className="text-white/80 text-xs font-medium mt-2">TAP TO SCAN</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Text className="text-gray-500 text-sm mt-6">
            {isScanning ? 'Reading your energy...' : 'Upload a photo to discover your aura'}
          </Text>
        </View>

        {/* Empty State (when no result and not scanning) */}
        {!result && !isScanning && (
          <View className="mx-6 mt-2 items-center mb-8">
            <Text className="text-lg font-semibold text-white">Your Daily Aura Awaits</Text>
            <Text className="text-sm text-gray-400 text-center mt-2 mx-4">
              Take a selfie and our AI will analyze your energy, mood, and personality.
            </Text>
            <View className="flex-row justify-center mt-6">
              <View className="items-center mx-4">
                <View className="h-10 w-10 rounded-full bg-gray-800 items-center justify-center">
                  <Ionicons name="camera" size={18} color="#9ca3af" />
                </View>
                <Text className="text-xs text-gray-500 mt-1">Selfie</Text>
              </View>
              <View className="items-center mx-4">
                <View className="h-10 w-10 rounded-full bg-gray-800 items-center justify-center">
                  <Ionicons name="sparkles" size={18} color="#9ca3af" />
                </View>
                <Text className="text-xs text-gray-500 mt-1">AI Analysis</Text>
              </View>
              <View className="items-center mx-4">
                <View className="h-10 w-10 rounded-full bg-gray-800 items-center justify-center">
                  <Ionicons name="share-outline" size={18} color="#9ca3af" />
                </View>
                <Text className="text-xs text-gray-500 mt-1">Share</Text>
              </View>
            </View>
          </View>
        )}

        {/* Result Card */}
        {result && (
          <Animated.View style={resultAnimatedStyle} className="mx-6 mb-6">
            <Pressable
              onPress={() => {
                hapticSelection();
                router.push(`/(protected)/aura/${result.id}`);
              }}
            >
              <LinearGradient
                colors={getAuraGradient(result.title)}
                className="rounded-3xl p-6 shadow-lg"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View className="flex-row justify-between items-start mb-3">
                  <Text className="text-white text-2xl font-bold flex-1 mr-2">{result.title}</Text>
                  <Text className="text-white/60 text-xs">{result.date}</Text>
                </View>

                <Text className="text-white/90 text-base leading-6 mb-5" numberOfLines={3}>
                  {result.description}
                </Text>

                {/* Stats */}
                <View className="flex-row mb-4">
                  {result.energy_level && (
                    <View className="bg-white/20 rounded-full px-3 py-1 mr-2 flex-row items-center">
                      <Ionicons name="flash" size={12} color="white" />
                      <Text className="text-white text-xs ml-1">{result.energy_level}%</Text>
                    </View>
                  )}
                  {result.mood_score && (
                    <View className="bg-white/20 rounded-full px-3 py-1 flex-row items-center">
                      <Ionicons name="heart" size={12} color="white" />
                      <Text className="text-white text-xs ml-1">{result.mood_score}/10</Text>
                    </View>
                  )}
                </View>

                <View className="flex-row gap-3">
                  <Pressable
                    onPress={handleShare}
                    className="flex-1 bg-white/20 py-3 rounded-xl flex-row items-center justify-center"
                  >
                    <Ionicons name="share-outline" size={18} color="white" />
                    <Text className="text-white font-semibold ml-2">Share</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleScan}
                    className="flex-1 bg-white/10 py-3 rounded-xl flex-row items-center justify-center border border-white/20"
                  >
                    <Ionicons name="refresh" size={18} color="white" />
                    <Text className="text-white font-semibold ml-2">Rescan</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Quick Actions */}
        {!isGuest && isAuthenticated && (
          <View className="px-6 mb-6">
            <Text className="text-lg font-bold text-white mb-3">Quick Actions</Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  hapticSelection();
                  router.push('/(protected)/history');
                }}
                className="flex-1 bg-gray-800/60 p-4 rounded-2xl border border-gray-700/50"
              >
                <Ionicons name="time-outline" size={24} color="#8b5cf6" />
                <Text className="text-white font-medium mt-2">History</Text>
                <Text className="text-gray-400 text-xs mt-0.5">Past readings</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  hapticSelection();
                  router.push('/(protected)/match');
                }}
                className="flex-1 bg-gray-800/60 p-4 rounded-2xl border border-gray-700/50"
              >
                <Ionicons name="people-outline" size={24} color="#ec4899" />
                <Text className="text-white font-medium mt-2">Match</Text>
                <Text className="text-gray-400 text-xs mt-0.5">Compare auras</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <View className="px-6 mb-8">
            <Text className="text-lg font-bold text-white mb-3">Recent Scans</Text>
            {history.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  hapticSelection();
                  router.push(`/(protected)/aura/${item.id}`);
                }}
                className="bg-gray-800/60 p-4 rounded-2xl mb-2 flex-row items-center border border-gray-700/50"
              >
                <LinearGradient
                  colors={getAuraGradient(item.title)}
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                >
                  <Ionicons name="sparkles" size={16} color="white" />
                </LinearGradient>
                <View className="flex-1">
                  <Text className="font-semibold text-white">{item.title}</Text>
                  <Text className="text-xs text-gray-400">{item.date}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#6b7280" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Upgrade CTA for guests */}
        {isGuest && (
          <View className="mx-6 mb-8">
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              className="rounded-2xl overflow-hidden"
            >
              <LinearGradient
                colors={['#4f46e5', '#7c3aed']}
                className="p-5 flex-row items-center"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg">Unlock Full Access</Text>
                  <Text className="text-white/70 text-sm mt-1">
                    Unlimited scans, history & aura matching
                  </Text>
                </View>
                <View className="bg-white/20 w-10 h-10 rounded-full items-center justify-center">
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
