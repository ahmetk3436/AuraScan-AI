import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Share, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticSelection } from '../../lib/haptics';
import { useAuth } from '../../contexts/AuthContext';

const PRIMARY_COLOR = '#7C3AED';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const opacity = useSharedValue(1);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const historyData = await SecureStore.getItemAsync('scan_history');
      if (historyData) {
        setHistory(JSON.parse(historyData));
      }
    } catch (error) {
      console.error('Failed to load history', error);
    }
  };

  const saveToHistory = async (newResult: any) => {
    try {
      const newHistory = [newResult, ...history].slice(0, 10);
      setHistory(newHistory);
      await SecureStore.setItemAsync('scan_history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save history', error);
    }
  };

  const handleScan = async () => {
    hapticSelection();
    
    // Request library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      hapticError();
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    // Launch Image Picker
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (pickerResult.canceled) {
      return;
    }

    setIsScanning(true);
    setResult(null);

    try {
      // Convert image to Base64
      // FIX: Using string literal 'base64' instead of FileSystem.EncodingType.Base64
      const base64 = await FileSystem.readAsStringAsync(pickerResult.assets[0].uri, {
        encoding: 'base64',
      });

      // Send to API
      const response = await api.post('/aura/scan', { image_data: base64 });
      
      const scanResult = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        ...response.data
      };
      
      setResult(scanResult);
      saveToHistory(scanResult);
      hapticSuccess();
    } catch (err) {
      hapticError();
      console.error(err);
      alert('Failed to analyze image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      await Share.share({
        message: `I just scanned my aura and got: ${result.title}! Check out this app.`,
      });
      hapticSelection();
    } catch (error) {
      hapticError();
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withRepeat(withTiming(0.5, { duration: 1000 }), -1, true),
    };
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-6 pt-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Aura Scanner</Text>
            <Text className="text-sm text-gray-500">Welcome back, {user?.email?.split('@')[0]}</Text>
          </View>
          <Pressable onPress={() => router.push('/(protected)/settings')} className="p-2 bg-white rounded-full shadow-sm">
            <Ionicons name="settings-outline" size={24} color="#374151" />
          </Pressable>
        </View>

        {/* Scan Button Area */}
        <View className="items-center justify-center py-8 mb-6">
          <Pressable
            onPress={handleScan}
            disabled={isScanning}
            className={`w-32 h-32 rounded-full items-center justify-center shadow-lg ${isScanning ? 'bg-gray-300' : 'bg-white'}`}
          >
            {isScanning ? (
              <Animated.View style={animatedStyle}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              </Animated.View>
            ) : (
              <Ionicons name="camera-outline" size={48} color={PRIMARY_COLOR} />
            )}
          </Pressable>
          <Text className="mt-4 text-gray-600 font-medium">
            {isScanning ? 'Analyzing...' : 'Tap to Scan'}
          </Text>
        </View>

        {/* Result Card */}
        {result && (
          <View className="mb-8">
            {/* FIX: Replaced LinearGradient with View using bg-purple-700 */}
            <View className="bg-purple-700 rounded-3xl p-6 shadow-lg shadow-black/10 mb-4">
              <View className="flex-row justify-between items-start mb-4">
                <Text className="text-white text-3xl font-bold">{result.title}</Text>
                <Text className="text-white/80 text-sm">{result.date}</Text>
              </View>
              
              <Text className="text-white/90 text-base leading-6 mb-6">
                {result.description}
              </Text>

              <View className="flex-row gap-3">
                <Pressable 
                  onPress={handleShare}
                  className="flex-1 bg-white/20 backdrop-blur-sm py-3 rounded-xl items-center flex-row justify-center"
                >
                  <Ionicons name="share-outline" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">Share</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <View className="mb-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">Recent Scans</Text>
            <FlatList
              data={history}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable 
                  onPress={() => { setResult(item); hapticSelection(); }}
                  className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                      <Ionicons name="sparkles" size={20} color={PRIMARY_COLOR} />
                    </View>
                    <View>
                      <Text className="font-semibold text-gray-900">{item.title}</Text>
                      <Text className="text-xs text-gray-500">{item.date}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </Pressable>
              )}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}