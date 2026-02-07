import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { hapticSelection } from '../../lib/haptics';

const TABS = [
  { name: 'home', label: 'Home', icon: 'sparkles', iconOutline: 'sparkles-outline' },
  { name: 'history', label: 'History', icon: 'time', iconOutline: 'time-outline' },
  { name: 'settings', label: 'Settings', icon: 'person', iconOutline: 'person-outline' },
] as const;

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading, isGuest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isDetailScreen = pathname.includes('/aura/') || pathname.includes('/paywall') || pathname.includes('/match');

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isGuest) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, isGuest]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-950">
        <View className="w-12 h-12 rounded-full bg-violet-600/20 items-center justify-center">
          <Ionicons name="sparkles" size={24} color="#8b5cf6" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-950">
      <Slot />
      {!isDetailScreen && (
        <View
          className="flex-row bg-gray-950 border-t border-gray-800/50 px-2"
          style={{ paddingBottom: insets.bottom || 16 }}
        >
          {TABS.map((tab) => {
            const isActive = pathname === `/${tab.name}` || pathname === `/(protected)/${tab.name}`;
            return (
              <Pressable
                key={tab.name}
                onPress={() => {
                  hapticSelection();
                  router.push(`/(protected)/${tab.name}` as any);
                }}
                className="flex-1 items-center pt-3 pb-1"
              >
                <Ionicons
                  name={(isActive ? tab.icon : tab.iconOutline) as any}
                  size={22}
                  color={isActive ? '#8b5cf6' : '#6b7280'}
                />
                <Text
                  className={`text-[10px] mt-1 font-medium ${
                    isActive ? 'text-violet-400' : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
