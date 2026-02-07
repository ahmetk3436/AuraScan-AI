import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { hapticError, hapticSuccess, hapticSelection } from '../../lib/haptics';

export default function LoginScreen() {
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      setIsLoading(false);
      hapticError();
      return;
    }

    try {
      await login(email, password);
      hapticSuccess();
      router.replace('/(protected)/home');
    } catch (err: any) {
      hapticError();
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const handleGuestMode = async () => {
    hapticSelection();
    await continueAsGuest();
    router.replace('/(protected)/home');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          {/* Logo */}
          <View className="items-center mb-10">
            <LinearGradient
              colors={['#7c3aed', '#ec4899']}
              className="w-20 h-20 rounded-3xl items-center justify-center mb-4"
            >
              <Ionicons name="sparkles" size={36} color="white" />
            </LinearGradient>
            <Text className="text-3xl font-bold text-white">AuraSnap</Text>
            <Text className="text-sm text-gray-400 mt-1">Discover your energy</Text>
          </View>

          {/* Form */}
          <View className="w-full">
            <Text className="text-xl font-bold text-white mb-1">Welcome back</Text>
            <Text className="text-sm text-gray-400 mb-6">Sign in to your account</Text>

            <Input
              label="Email"
              placeholder="email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? (
              <View className="bg-red-900/30 rounded-xl p-3 mb-4 border border-red-500/20">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            ) : null}

            <Button
              onPress={handleLogin}
              disabled={isLoading}
              variant="primary"
              className="w-full mb-3"
            >
              {isLoading ? <ActivityIndicator size="small" color="#ffffff" /> : 'Sign In'}
            </Button>

            {/* Guest Mode */}
            <Pressable
              onPress={handleGuestMode}
              className="w-full border border-gray-700 rounded-2xl py-3.5 items-center mb-6"
            >
              <Text className="text-gray-300 font-medium">Try Without Account</Text>
            </Pressable>

            <View className="flex-row justify-center items-center">
              <Text className="text-gray-500">Don't have an account? </Text>
              <Pressable onPress={() => router.push('/(auth)/register')}>
                <Text className="text-violet-400 font-semibold">Sign Up</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
