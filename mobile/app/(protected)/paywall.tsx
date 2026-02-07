import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Purchases from 'react-native-purchases';

const features = [
  { title: 'Unlimited Scans', icon: 'sparkles', iconColor: '#8b5cf6', bg: 'bg-violet-500/10' },
  { title: 'AI Compatibility', icon: 'people', iconColor: '#ec4899', bg: 'bg-pink-500/10' },
  { title: 'Full History', icon: 'time', iconColor: '#22c55e', bg: 'bg-green-500/10' },
  { title: 'Rare Aura Colors', icon: 'color-palette', iconColor: '#f59e0b', bg: 'bg-amber-500/10' },
  { title: 'No Ads', icon: 'eye-off', iconColor: '#3b82f6', bg: 'bg-blue-500/10' },
  { title: 'Priority Analysis', icon: 'flash', iconColor: '#f97316', bg: 'bg-orange-500/10' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [offerings, setOfferings] = useState<any>(null);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    fetchOfferings();
  }, []);

  const fetchOfferings = async () => {
    try {
      const result = await Purchases.getOfferings();
      if (result.current) {
        setOfferings(result.current);
        const monthly = result.current.availablePackages.find(
          (p: any) => p.packageType === 'MONTHLY'
        );
        setSelectedPkg(monthly || result.current.availablePackages[0]);
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setIsPurchasing(true);
    try {
      await Purchases.purchasePackage(selectedPkg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.message || 'An unknown error occurred');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      await Purchases.restorePurchases();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Purchases restored');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Restore Failed', error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Close Button */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }}
        className="absolute top-14 right-4 z-50 w-8 h-8 rounded-full bg-gray-800/80 items-center justify-center"
      >
        <Ionicons name="close" size={18} color="#9ca3af" />
      </Pressable>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#2e1065', '#020617']}
          className="items-center pt-16 pb-10"
        >
          <LinearGradient
            colors={['#7c3aed', '#ec4899']}
            className="w-24 h-24 rounded-full items-center justify-center mb-4"
          >
            <Ionicons name="sparkles" size={40} color="white" />
          </LinearGradient>
          <Text className="text-3xl font-bold text-white text-center">Unlock Your Full Aura</Text>
          <Text className="text-base text-gray-400 text-center mt-2 px-8">See what your energy reveals</Text>
        </LinearGradient>

        {/* Features */}
        <View className="mt-6">
          {features.map((feature, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 80).springify()}
              className="flex-row items-center mx-6 my-1.5 bg-gray-800/50 rounded-xl p-4"
            >
              <View className={`h-10 w-10 rounded-full ${feature.bg} items-center justify-center mr-4`}>
                <Ionicons name={feature.icon as any} size={20} color={feature.iconColor} />
              </View>
              <Text className="flex-1 text-white font-medium">{feature.title}</Text>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            </Animated.View>
          ))}
        </View>

        {/* Packages */}
        <View className="mt-8 mb-32">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mx-6 mb-3">
            Choose Your Plan
          </Text>
          {offerings?.availablePackages.map((pkg: any) => (
            <Pressable
              key={pkg.identifier}
              onPress={() => {
                setSelectedPkg(pkg);
                Haptics.selectionAsync();
              }}
              className={`mx-6 my-2 rounded-2xl border-2 p-5 relative overflow-hidden ${
                selectedPkg?.identifier === pkg.identifier
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-gray-700 bg-gray-900'
              }`}
            >
              {pkg.packageType === 'MONTHLY' && (
                <View className="absolute top-0 right-0 bg-violet-600 px-3 py-1 rounded-bl-xl">
                  <Text className="text-[10px] font-bold text-white">Most Popular</Text>
                </View>
              )}
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold">{pkg.product.title}</Text>
                  <Text className="text-gray-400 text-sm">{pkg.product.description}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-white text-xl font-bold">{pkg.product.priceString}</Text>
                  {pkg.packageType === 'ANNUAL' && (
                    <Text className="text-green-400 text-xs font-semibold mt-1">Save 33%</Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="absolute bottom-0 w-full bg-gray-950/95 border-t border-gray-800/50 p-6 pb-10">
        <Pressable
          onPress={handlePurchase}
          disabled={isPurchasing}
          className="rounded-full py-4 items-center overflow-hidden"
        >
          <LinearGradient
            colors={['#7c3aed', '#ec4899']}
            className="absolute inset-0"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          {isPurchasing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Start Free Trial</Text>
          )}
        </Pressable>

        <Pressable onPress={handleRestore} className="mt-3 items-center">
          <Text className="text-violet-400 text-sm font-medium">Restore Purchases</Text>
        </Pressable>

        <Text className="text-[10px] text-gray-500 text-center mt-3 leading-4">
          Cancel anytime. Subscription renews unless cancelled 24h before the end of the current period.
        </Text>
      </View>
    </SafeAreaView>
  );
}
