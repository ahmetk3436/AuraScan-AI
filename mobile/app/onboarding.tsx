import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Dimensions, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const PRIMARY_COLOR = '#8b5cf6';

export default function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width } = Dimensions.get('window');
  const router = useRouter();

  const handleScroll = (event: any) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(xOffset / width);
    setCurrentPage(pageIndex);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollViewRef.current?.scrollTo({ x: width * (currentPage + 1), animated: true });
  };

  const handleGuestStart = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await AsyncStorage.setItem('guest_mode', 'true');
    router.replace('/(protected)/home');
  };

  const handleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Main Scroll Container */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        className="flex-1"
      >
        {/* Page 0: Welcome */}
        <View className="w-full h-full justify-center items-center px-6" style={{ width }}>
          <LinearGradient colors={['#8b5cf6', '#ec4899']} className="w-44 h-44 rounded-full mb-8 shadow-lg shadow-violet-500/50">
            <View className="flex-1 justify-center items-center">
               <Ionicons name="sparkles" size={64} color="white" />
            </View>
          </LinearGradient>
          <Text className="text-3xl font-bold text-white mb-4 text-center">Discover Your Aura</Text>
          <Text className="text-base text-gray-400 text-center leading-6">Your energy tells a story. Let's read it together.</Text>
        </View>

        {/* Page 1: Features */}
        <View className="w-full h-full justify-center px-6" style={{ width }}>
          <Text className="text-3xl font-bold text-white mb-8 text-center">Unlock Your Potential</Text>
          
          {/* Feature 1 */}
          <View className="flex-row items-center mx-4 mb-6">
            <View className="h-16 w-16 rounded-full bg-violet-600/20 items-center justify-center mr-4">
              <Ionicons name="sparkles" size={32} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-white">AI-Powered Analysis</Text>
              <Text className="text-sm text-gray-400">Deep learning reads your vibe.</Text>
            </View>
          </View>

          {/* Feature 2 */}
          <View className="flex-row items-center mx-4 mb-6">
            <View className="h-16 w-16 rounded-full bg-green-500/20 items-center justify-center mr-4">
              <Ionicons name="camera" size={32} color="#22c55e" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-white">Selfie Scanning</Text>
              <Text className="text-sm text-gray-400">Instant results from your photos.</Text>
            </View>
          </View>

          {/* Feature 3 */}
          <View className="flex-row items-center mx-4 mb-6">
            <View className="h-16 w-16 rounded-full bg-pink-500/20 items-center justify-center mr-4">
              <Ionicons name="people" size={32} color="#ec4899" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-white">Friend Matching</Text>
              <Text className="text-sm text-gray-400">See who you vibe with best.</Text>
            </View>
          </View>
        </View>

        {/* Page 2: CTA */}
        <View className="w-full h-full justify-center items-center px-6" style={{ width }}>
          <View className="h-32 w-32 rounded-full bg-gray-800 items-center justify-center mb-8">
            <Ionicons name="sparkles" size={64} color="#8b5cf6" />
          </View>
          <Text className="text-3xl font-bold text-white mb-12 text-center">Ready to Begin?</Text>
          
          <Pressable onPress={handleGuestStart} className="w-full bg-violet-600 rounded-full py-4 items-center shadow-lg shadow-violet-600/30 active:scale-95 transition-transform">
            <Text className="text-white font-bold text-lg">Try Free</Text>
          </Pressable>

          <Pressable onPress={handleSignIn} className="w-full border border-gray-600 rounded-full py-4 mt-4 items-center active:bg-gray-800 transition-colors">
            <Text className="text-white font-semibold text-lg">Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Controls Overlay */}
      <View className="absolute bottom-0 w-full pb-12 pt-6 px-6 bg-gradient-to-t from-gray-950 to-transparent">
        {/* Page Indicators */}
        <View className="flex-row justify-center mb-6">
          <View className={`h-2 w-2 rounded-full mx-1 ${currentPage === 0 ? 'bg-violet-500' : 'bg-gray-600'}`} />
          <View className={`h-2 w-2 rounded-full mx-1 ${currentPage === 1 ? 'bg-violet-500' : 'bg-gray-600'}`} />
          <View className={`h-2 w-2 rounded-full mx-1 ${currentPage === 2 ? 'bg-violet-500' : 'bg-gray-600'}`} />
        </View>

        {/* Next Button (Only visible on pages 0 and 1) */}
        {currentPage < 2 && (
          <Pressable onPress={handleNext} className="absolute right-6 bottom-12 h-12 w-12 bg-gray-800 rounded-full items-center justify-center border border-gray-700">
            <Ionicons name="arrow-forward" size={24} color="white" />
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}