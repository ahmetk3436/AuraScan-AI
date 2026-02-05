import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { hapticMedium } from '../../lib/haptics';
import ColorDistribution from '../../components/history/ColorDistribution';
import ReadingList from '../../components/history/ReadingList';

interface AuraReading {
  id: string;
  aura_color: string;
  energy_level: number;
  mood_score: number;
  created_at: string;
}

interface Stats {
  color_distribution: Record<string, number>;
  total_readings: number;
  average_energy: number;
  average_mood: number;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [readings, setReadings] = useState<AuraReading[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [readingsRes, statsRes] = await Promise.all([
        api.get('/aura?page=1&page_size=50'),
        api.get('/aura/stats'),
      ]);
      setReadings(readingsRes.data.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSelectReading = (id: string) => {
    hapticMedium();
    router.push(`/aura/${id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
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
        <View className="px-6 pt-4 pb-2">
          <Text className="text-3xl font-bold text-white">Your Journey</Text>
          <Text className="mt-1 text-gray-400">Track your aura over time</Text>
        </View>

        {/* Stats Summary */}
        {stats && stats.total_readings > 0 && (
          <View className="mx-6 mt-6 flex-row space-x-3">
            <View className="flex-1 items-center rounded-xl bg-gray-800/50 p-4">
              <Ionicons name="analytics" size={24} color="#8b5cf6" />
              <Text className="mt-2 text-2xl font-bold text-white">
                {stats.total_readings}
              </Text>
              <Text className="text-xs text-gray-400">Total Scans</Text>
            </View>
            <View className="w-3" />
            <View className="flex-1 items-center rounded-xl bg-gray-800/50 p-4">
              <Ionicons name="flash" size={24} color="#22c55e" />
              <Text className="mt-2 text-2xl font-bold text-white">
                {Math.round(stats.average_energy)}%
              </Text>
              <Text className="text-xs text-gray-400">Avg Energy</Text>
            </View>
            <View className="w-3" />
            <View className="flex-1 items-center rounded-xl bg-gray-800/50 p-4">
              <Text className="text-2xl">
                {stats.average_mood >= 7 ? '😊' : '😌'}
              </Text>
              <Text className="mt-2 text-2xl font-bold text-white">
                {stats.average_mood.toFixed(1)}
              </Text>
              <Text className="text-xs text-gray-400">Avg Mood</Text>
            </View>
          </View>
        )}

        {/* Color Distribution */}
        {stats && stats.total_readings > 0 && (
          <View className="mx-6 mt-6">
            <ColorDistribution distribution={stats.color_distribution} />
          </View>
        )}

        {/* Reading History */}
        <View className="mx-6 mt-8">
          <Text className="mb-4 text-lg font-semibold text-white">
            Recent Readings
          </Text>
          <ReadingList readings={readings} onSelect={handleSelectReading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
