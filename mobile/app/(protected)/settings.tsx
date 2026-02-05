import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { hapticSelection, hapticSuccess, hapticWarning, hapticMedium } from '../../lib/haptics';
import { isBiometricAvailable, getBiometricType } from '../../lib/biometrics';
import StatsSection from '../../components/settings/StatsSection';
import UnlockedColors from '../../components/settings/UnlockedColors';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_scans: number;
  unlocked_colors: string[];
}

export default function SettingsScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStreak = useCallback(async () => {
    try {
      const { data } = await api.get('/aura/streak');
      setStreak(data);
    } catch {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    fetchStreak();
    const checkBiometrics = async () => {
      const available = await isBiometricAvailable();
      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
      }
    };
    checkBiometrics();
  }, [fetchStreak]);

  const handleLogout = () => {
    hapticSelection();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            hapticSuccess();
          },
        },
      ]
    );
  };

  const confirmDelete = () => {
    hapticWarning();
    Alert.alert(
      'Delete Account',
      'This action is permanent. All your data will be erased and cannot be recovered. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      hapticSuccess();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to delete account'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShareApp = async () => {
    hapticSelection();
    try {
      await Linking.openURL('https://apps.apple.com/app/aurasnap');
    } catch {
      Alert.alert('Share', 'Check out AuraSnap - Discover your aura energy!');
    }
  };

  const handleRateUs = () => {
    hapticSelection();
    Linking.openURL('https://apps.apple.com/app/aurasnap?action=write-review');
  };

  const handleRestorePurchases = () => {
    hapticMedium();
    Alert.alert('Restore Purchases', 'Checking for previous purchases...');
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
          <Text className="text-3xl font-bold text-white">Settings</Text>
        </View>

        {/* Profile */}
        <View className="mx-6 mt-6 flex-row items-center rounded-2xl bg-gray-800/50 p-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-violet-600">
            <Ionicons name="person" size={28} color="#fff" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-semibold text-white">
              {user?.email || 'User'}
            </Text>
            <Text className="text-sm text-gray-400">Member</Text>
          </View>
        </View>

        {/* Stats */}
        {streak && (
          <View className="mx-6 mt-6">
            <StatsSection
              currentStreak={streak.current_streak}
              longestStreak={streak.longest_streak}
              totalScans={streak.total_scans}
            />
          </View>
        )}

        {/* Unlocked Colors */}
        {streak && (
          <View className="mx-6 mt-6">
            <UnlockedColors
              unlocked={streak.unlocked_colors || []}
              currentStreak={streak.current_streak}
            />
          </View>
        )}

        {/* Security */}
        {biometricType && (
          <View className="mx-6 mt-8">
            <Text className="mb-4 text-sm font-semibold uppercase text-gray-400">
              Security
            </Text>
            <View className="flex-row items-center justify-between rounded-xl bg-gray-800/50 p-4">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-600/20">
                  <Ionicons name="finger-print" size={20} color="#3b82f6" />
                </View>
                <View className="ml-3">
                  <Text className="text-white">{biometricType}</Text>
                  <Text className="text-xs text-gray-400">Unlock with biometrics</Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ true: '#8b5cf6' }}
              />
            </View>
          </View>
        )}

        {/* Actions */}
        <View className="mx-6 mt-8">
          <Text className="mb-4 text-sm font-semibold uppercase text-gray-400">
            App
          </Text>

          <TouchableOpacity
            onPress={handleShareApp}
            className="flex-row items-center rounded-xl bg-gray-800/50 p-4"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-violet-600/20">
              <Ionicons name="share-outline" size={20} color="#8b5cf6" />
            </View>
            <Text className="ml-4 flex-1 text-white">Share App</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <View className="h-2" />

          <TouchableOpacity
            onPress={handleRateUs}
            className="flex-row items-center rounded-xl bg-gray-800/50 p-4"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-600/20">
              <Ionicons name="star-outline" size={20} color="#f59e0b" />
            </View>
            <Text className="ml-4 flex-1 text-white">Rate Us</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <View className="h-2" />

          <TouchableOpacity
            onPress={handleRestorePurchases}
            className="flex-row items-center rounded-xl bg-gray-800/50 p-4"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-green-600/20">
              <Ionicons name="refresh-outline" size={20} color="#22c55e" />
            </View>
            <Text className="ml-4 flex-1 text-white">Restore Purchases</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View className="mx-6 mt-8">
          <Text className="mb-4 text-sm font-semibold uppercase text-gray-400">
            Account
          </Text>

          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center rounded-xl bg-gray-800/50 p-4"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-600/20">
              <Ionicons name="log-out-outline" size={20} color="#9ca3af" />
            </View>
            <Text className="ml-4 flex-1 text-white">Sign Out</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <View className="h-2" />

          <TouchableOpacity
            onPress={confirmDelete}
            className="flex-row items-center rounded-xl bg-red-900/20 p-4"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-red-600/20">
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </View>
            <Text className="ml-4 flex-1 text-red-400">Delete Account</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View className="mx-6 mt-8 items-center">
          <Text className="text-sm text-gray-600">AuraSnap v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
      >
        <Text className="mb-4 text-sm text-gray-400">
          Enter your password to confirm account deletion. This cannot be undone.
        </Text>
        <View className="mb-4">
          <Input
            placeholder="Your password"
            value={deletePassword}
            onChangeText={setDeletePassword}
            secureTextEntry
          />
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowDeleteModal(false)}
            />
          </View>
          <View className="flex-1">
            <Button
              title="Delete"
              variant="destructive"
              onPress={handleDeleteAccount}
              isLoading={isDeleting}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
