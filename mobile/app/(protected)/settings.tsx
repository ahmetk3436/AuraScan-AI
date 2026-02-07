import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, Alert, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { hapticSelection, hapticSuccess, hapticMedium, hapticError } from '../../lib/haptics';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

export default function SettingsScreen() {
  const router = useRouter();
  const { isSubscribed, handleRestore } = useSubscription();
  const { isAuthenticated, isGuest, user, logout, deleteAccount } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const toggleBiometric = async (newValue: boolean) => {
    hapticSelection();
    await AsyncStorage.setItem('biometric_enabled', String(newValue));
    setBiometricEnabled(newValue);
  };

  const handleShareApp = async () => {
    hapticSelection();
    await Share.share({
      message: 'Discover your aura energy with AI! Download AuraSnap: https://apps.apple.com/app/aurasnap',
    });
  };

  const handleRestorePurchases = async () => {
    hapticMedium();
    const restored = await handleRestore();
    if (restored) {
      hapticSuccess();
      Alert.alert('Success', 'Your purchases have been restored!');
    } else {
      Alert.alert('No Purchases Found', 'We could not find any previous purchases.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          hapticSuccess();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      hapticSuccess();
      router.replace('/(auth)/login');
    } catch {
      hapticError();
      Alert.alert('Error', 'Failed to delete account. Please check your password.');
    }
  };

  const SettingsRow = ({
    icon,
    iconColor,
    iconBg,
    label,
    onPress,
    showChevron = true,
    rightElement,
    destructive = false,
  }: {
    icon: string;
    iconColor: string;
    iconBg: string;
    label: string;
    onPress?: () => void;
    showChevron?: boolean;
    rightElement?: React.ReactNode;
    destructive?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3"
      disabled={!onPress && !rightElement}
    >
      <View className="flex-row items-center gap-3">
        <View className={`w-9 h-9 rounded-xl items-center justify-center ${iconBg}`}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text className={`text-base font-medium ${destructive ? 'text-red-400' : 'text-white'}`}>
          {label}
        </Text>
      </View>
      {rightElement || (showChevron && <Ionicons name="chevron-forward" size={18} color="#4b5563" />)}
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text className="text-2xl font-bold text-white mb-1">Settings</Text>
        <Text className="text-sm text-gray-400 mb-6">
          {isGuest ? 'Guest Mode' : user?.email}
        </Text>

        {/* Guest Upgrade Card */}
        {isGuest && (
          <Pressable onPress={() => router.push('/(auth)/register')} className="mb-6">
            <LinearGradient
              colors={['#4f46e5', '#7c3aed']}
              className="rounded-2xl p-5"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View className="flex-row items-center gap-3 mb-2">
                <Ionicons name="sparkles" size={22} color="white" />
                <Text className="text-lg font-bold text-white">Create Account</Text>
              </View>
              <Text className="text-white/70 text-sm leading-5">
                Unlock unlimited scans, history, and aura matching.
              </Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Premium Card */}
        {!isSubscribed && isAuthenticated && (
          <Pressable onPress={() => router.push('/(protected)/paywall')} className="mb-6">
            <LinearGradient
              colors={['#7c3aed', '#ec4899']}
              className="rounded-2xl p-5"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View className="flex-row items-center gap-3 mb-2">
                <Ionicons name="diamond" size={22} color="white" />
                <Text className="text-lg font-bold text-white">Unlock Premium</Text>
              </View>
              <Text className="text-white/70 text-sm leading-5">
                Unlimited scans, no ads, full history access.
              </Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Account Section */}
        {isAuthenticated && (
          <>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 ml-1">
              Account
            </Text>
            <View className="bg-gray-900/80 rounded-2xl px-4 mb-6 border border-gray-800/50">
              <SettingsRow
                icon="finger-print"
                iconColor="#8b5cf6"
                iconBg="bg-violet-500/10"
                label="Biometric Login"
                showChevron={false}
                rightElement={
                  <Switch
                    trackColor={{ false: '#374151', true: '#7c3aed' }}
                    thumbColor="#ffffff"
                    onValueChange={toggleBiometric}
                    value={biometricEnabled}
                  />
                }
              />
            </View>
          </>
        )}

        {/* App Section */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 ml-1">
          App
        </Text>
        <View className="bg-gray-900/80 rounded-2xl px-4 mb-6 border border-gray-800/50">
          <SettingsRow
            icon="share-social"
            iconColor="#3b82f6"
            iconBg="bg-blue-500/10"
            label="Share App"
            onPress={handleShareApp}
          />
          <View className="h-px bg-gray-800/50" />
          <SettingsRow
            icon="star"
            iconColor="#f59e0b"
            iconBg="bg-amber-500/10"
            label="Rate Us"
            onPress={() => Linking.openURL('https://apps.apple.com/app/aurasnap')}
          />
          <View className="h-px bg-gray-800/50" />
          <SettingsRow
            icon="shield-outline"
            iconColor="#6b7280"
            iconBg="bg-gray-500/10"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://aurasnap.app/privacy')}
          />
        </View>

        {/* Subscription Section */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 ml-1">
          Subscription
        </Text>
        <View className="bg-gray-900/80 rounded-2xl px-4 mb-6 border border-gray-800/50">
          <SettingsRow
            icon="refresh"
            iconColor="#10b981"
            iconBg="bg-emerald-500/10"
            label="Restore Purchases"
            onPress={handleRestorePurchases}
          />
        </View>

        {/* Danger Zone */}
        {isAuthenticated && (
          <>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 ml-1">
              Account Actions
            </Text>
            <View className="bg-gray-900/80 rounded-2xl px-4 mb-6 border border-gray-800/50">
              <SettingsRow
                icon="log-out-outline"
                iconColor="#f59e0b"
                iconBg="bg-amber-500/10"
                label="Sign Out"
                onPress={handleLogout}
              />
              <View className="h-px bg-gray-800/50" />
              <SettingsRow
                icon="trash-outline"
                iconColor="#ef4444"
                iconBg="bg-red-500/10"
                label="Delete Account"
                onPress={() => setShowDeleteModal(true)}
                destructive
              />
            </View>
          </>
        )}

        {/* Sign In for Guests */}
        {isGuest && (
          <>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 ml-1">
              Account
            </Text>
            <View className="bg-gray-900/80 rounded-2xl px-4 mb-6 border border-gray-800/50">
              <SettingsRow
                icon="log-in-outline"
                iconColor="#8b5cf6"
                iconBg="bg-violet-500/10"
                label="Sign In"
                onPress={() => router.push('/(auth)/login')}
              />
              <View className="h-px bg-gray-800/50" />
              <SettingsRow
                icon="person-add-outline"
                iconColor="#22c55e"
                iconBg="bg-green-500/10"
                label="Create Account"
                onPress={() => router.push('/(auth)/register')}
              />
            </View>
          </>
        )}

        {/* Footer */}
        <Text className="text-center text-gray-600 text-xs mb-8">AuraSnap v1.0.0</Text>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <Text className="text-gray-400 text-sm mb-4">
          This action is permanent. Enter your password to confirm.
        </Text>
        <Input
          label="Password"
          placeholder="Enter your password"
          value={deletePassword}
          onChangeText={setDeletePassword}
          secureTextEntry
        />
        <View className="flex-row gap-3 mt-4">
          <Pressable
            onPress={() => setShowDeleteModal(false)}
            className="flex-1 bg-gray-800 py-3 rounded-xl items-center"
          >
            <Text className="text-white font-medium">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteAccount}
            className="flex-1 bg-red-600 py-3 rounded-xl items-center"
          >
            <Text className="text-white font-bold">Delete</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
