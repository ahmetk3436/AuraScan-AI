import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { hapticError, hapticSuccess } from '../../lib/haptics';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      setIsLoading(false);
      hapticError();
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setIsLoading(false);
      hapticError();
      return;
    }

    try {
      await register(email, password);
      hapticSuccess();
      router.replace('/(protected)/home');
    } catch (err: any) {
      hapticError();
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
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

          <View className="w-full">
            <Text className="text-xl font-bold text-white mb-1">Create Account</Text>
            <Text className="text-sm text-gray-400 mb-6">Start your aura journey today</Text>

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
              placeholder="Min 8 characters"
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
              onPress={handleRegister}
              disabled={isLoading}
              variant="primary"
              className="w-full mb-6"
            >
              {isLoading ? <ActivityIndicator size="small" color="#ffffff" /> : 'Create Account'}
            </Button>

            <View className="flex-row justify-center items-center">
              <Text className="text-gray-500">Already have an account? </Text>
              <Pressable onPress={() => router.push('/(auth)/login')}>
                <Text className="text-violet-400 font-semibold">Sign In</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
