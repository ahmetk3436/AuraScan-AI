import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const onboarded = await AsyncStorage.getItem('onboarding_complete');
        
        if (!onboarded) {
          router.replace('/onboarding');
          return;
        }

        const isGuest = await AsyncStorage.getItem('guest_mode');
        
        if (isGuest === 'true') {
          router.replace('/(protected)/home');
        } else {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Error checking app status:', error);
        // Fallback to login if something goes wrong
        router.replace('/(auth)/login');
      }
    };

    checkStatus();
  }, [router]);

  return (
    <View className="flex-1 bg-gray-950 justify-center items-center">
      <ActivityIndicator size="large" color="#8b5cf6" />
    </View>
  );
}