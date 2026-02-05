import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticMedium } from '../../lib/haptics';
import ScanButton from '../../components/aura/ScanButton';
import AuraCard from '../../components/aura/AuraCard';
import StreakBadge from '../../components/aura/StreakBadge';

interface AuraReading {
  id: string;
  aura_color: string;
  energy_level: number;
  personality: string;
  mood_score: number;
}

interface StreakData {
  current_streak: number;
  total_scans: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [todayAura, setTodayAura] = useState<AuraReading | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTodayAura = useCallback(async () => {
    try {
      const { data } = await api.get('/aura/today');
      setTodayAura(data);
    } catch {
      setTodayAura(null);
    }
  }, []);

  const fetchStreak = useCallback(async () => {
    try {
      const { data } = await api.get('/aura/streak');
      setStreak(data);
    } catch {
      setStreak(null);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTodayAura(), fetchStreak()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchTodayAura, fetchStreak]);

  const handleScan = async () => {
    try {
      hapticMedium();

      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to scan your aura.');
        return;
      }

      // Open camera (front-facing for selfie)
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        cameraType: ImagePicker.CameraType.front,
        quality: 0.7,
        allowsEditing: false,
      });

      if (result.canceled) {
        return;
      }

      setIsScanning(true);

      // Mock delay for "reading energy" effect
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Call API to create aura reading
      const { data } = await api.post('/aura/scan', {
        image_url: result.assets[0].uri,
      });

      // Update streak
      await api.post('/aura/streak/update');

      hapticSuccess();
      setIsScanning(false);

      // Navigate to results
      router.push(`/aura/${data.id}`);
    } catch (error) {
      hapticError();
      setIsScanning(false);
      Alert.alert('Scan Failed', 'Unable to read your aura. Please try again.');
    }
  };

  const handleViewAura = () => {
    if (todayAura) {
      hapticMedium();
      router.push(`/aura/${todayAura.id}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-3xl font-bold text-white">AuraSnap</Text>
          <Text className="mt-1 text-gray-400">Discover your energy today</Text>
        </View>

        {/* Streak Badge */}
        {streak && (
          <View className="mt-4">
            <StreakBadge streak={streak.current_streak} totalScans={streak.total_scans} />
          </View>
        )}

        {/* Today's Aura or Scan Button */}
        {todayAura ? (
          <View className="mt-8">
            <Text className="mb-4 px-6 text-lg font-semibold text-white">
              Today's Aura
            </Text>
            <AuraCard
              auraColor={todayAura.aura_color}
              energyLevel={todayAura.energy_level}
              personality={todayAura.personality}
              onPress={handleViewAura}
            />

            {/* Scan Again Option */}
            <View className="mt-6 items-center">
              <TouchableOpacity
                onPress={handleScan}
                disabled={isScanning}
                className="flex-row items-center rounded-full bg-violet-600/20 px-6 py-3"
              >
                <Ionicons name="refresh" size={20} color="#8b5cf6" />
                <Text className="ml-2 font-medium text-violet-400">
                  Scan Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="mt-12 items-center">
            <ScanButton onPress={handleScan} isLoading={isScanning} />
          </View>
        )}

        {/* Quick Actions */}
        <View className="mt-10 px-6">
          <Text className="mb-4 text-lg font-semibold text-white">
            Quick Actions
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/match')}
            className="flex-row items-center rounded-2xl bg-gray-800/50 p-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-pink-500/20">
              <Ionicons name="people" size={24} color="#ec4899" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-white">Compare with Friend</Text>
              <Text className="text-sm text-gray-400">
                See your aura compatibility
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Aura Tip */}
        <View className="mx-6 mt-8 rounded-2xl bg-gradient-to-r from-violet-900/50 to-indigo-900/50 p-5">
          <View className="flex-row items-start">
            <Ionicons name="bulb-outline" size={24} color="#a78bfa" />
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-violet-300">Aura Tip</Text>
              <Text className="mt-1 text-sm text-gray-300">
                Scan your aura daily to track your energy patterns and unlock rare aura colors!
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
