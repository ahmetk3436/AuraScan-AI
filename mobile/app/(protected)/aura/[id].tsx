import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../lib/api';
import { hapticMedium, hapticSuccess, hapticSelection } from '../../../lib/haptics';

const PRIMARY_COLOR = '#7C3AED';

export default function AuraResultScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Data from params/API
  const [auraData, setAuraData] = useState({
    colorName: 'Mystic Violet',
    primaryColor: '#7C3AED',
    secondaryColor: '#DB2777',
    description: 'Your aura radiates creativity and deep intuition. You are connected to higher realms of consciousness.',
  });

  // Animation States
  const [displayedChars, setDisplayedChars] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Particle State
  const [particles, setParticles] = useState<Array<{
    id: number;
    color: string;
    animatedStyle: any;
  }>>([]);

  // Orb Animation Values
  const orbScale = useSharedValue(0);
  const orbY = useSharedValue(-50);
  const contentOpacity = useSharedValue(0);
  const cursorOpacity = useSharedValue(1);

  // Styles
  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: orbScale.value },
      { translateY: orbY.value }
    ]
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { translateY: interpolate(contentOpacity.value, [0, 1], [20, 0]) }
    ]
  }));

  // Trigger Function
  const triggerReveal = () => {
    hapticMedium(); // 1. Haptic Start

    // 2. Orb Animation (Spring)
    orbScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    orbY.value = withSpring(0, { damping: 15 });

    // 3. Content Fade In (Delayed)
    contentOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));

    // 4. Haptic Success (Delayed)
    setTimeout(() => {
      hapticSuccess();
    }, 600);

    // 5. Start Typewriter
    startTypewriter();

    // 6. Explode Particles
    explodeParticles();
  };

  const startTypewriter = () => {
    const fullText = auraData.colorName;
    let index = 0;
    
    // Blink cursor
    const cursorInterval = setInterval(() => {
      cursorOpacity.value = withTiming(cursorOpacity.value === 1 ? 0 : 1, { duration: 100 });
    }, 500);

    // Type text
    const typeInterval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedChars(prev => prev + 1);
        index++;
      } else {
        clearInterval(typeInterval);
        clearInterval(cursorInterval);
        cursorOpacity.value = 0; // Hide cursor when done
      }
    }, 50); // 50ms per char
  };

  const explodeParticles = () => {
    const newParticles = [];
    const colors = [auraData.primaryColor, auraData.secondaryColor, '#FFFFFF'];
    
    for (let i = 0; i < 12; i++) {
      const transX = useSharedValue(0);
      const transY = useSharedValue(0);
      const opacity = useSharedValue(1);
      const scale = useSharedValue(1);

      // Random destination
      const destX = (Math.random() - 0.5) * 200; // -100 to 100
      const destY = (Math.random() - 0.5) * 200;

      // Animate
      transX.value = withTiming(destX, { duration: 1500, easing: Easing.out(Easing.quad) });
      transY.value = withTiming(destY, { duration: 1500, easing: Easing.out(Easing.quad) });
      opacity.value = withTiming(0, { duration: 1500 });
      scale.value = withTiming(0, { duration: 1500 });

      newParticles.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        animatedStyle: useAnimatedStyle(() => ({
          transform: [{ translateX: transX.value }, { translateY: transY.value }, { scale: scale.value }],
          opacity: opacity.value,
          left: '50%', // Start from center
          top: '40%',  // Start near orb
          marginLeft: -4, // Center the 8px particle
          marginTop: -4
        }))
      });
    }
    setParticles(newParticles);
  };

  // Fetch data logic
  useEffect(() => {
    const fetchAura = async () => {
      try {
        // Simulate API call structure as per plan
        // const { data } = await api.get(`/aura/${id}`);
        // setAuraData(data);
        
        // For now, keeping default state to ensure visual works immediately
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to fetch aura', error);
        setIsLoaded(true); // Proceed anyway to show UI
      }
    };

    fetchAura();
  }, [id]);

  // Trigger animations when data is loaded
  useEffect(() => {
    if (isLoaded) {
      triggerReveal();
    }
  }, [isLoaded]);

  const handleShare = async () => {
    hapticSelection();
    try {
      await Share.share({
        message: `My Aura is ${auraData.colorName}! ✨ Discover yours with AuraSnap.`,
        url: 'https://aurasnap.app/share/' + id // Placeholder deep link
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      {/* Background Gradient */}
      <LinearGradient 
        colors={['#111827', '#000000']} 
        className="absolute inset-0" 
      />

      <View className="flex-1 relative">
        
        {/* 1. Celebration Particles Layer */}
        <View className="absolute inset-0 pointer-events-none">
          {particles.map((particle, index) => (
            <Animated.View
              key={particle.id}
              className="absolute rounded-full"
              style={[
                { width: 8, height: 8, backgroundColor: particle.color },
                particle.animatedStyle
              ]}
            />
          ))}
        </View>

        {/* 2. Main Content Container */}
        <View className="flex-1 items-center justify-center px-6">
          
          {/* 3. Animated Aura Orb */}
          <Animated.View style={orbAnimatedStyle} className="mb-12">
            <LinearGradient
              colors={[auraData.primaryColor, auraData.secondaryColor]}
              className="w-64 h-64 rounded-full shadow-2xl"
              style={{
                shadowColor: auraData.primaryColor,
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.6,
                shadowRadius: 40,
              }}
            >
              {/* Inner Glow */}
              <View className="flex-1 items-center justify-center">
                 <Ionicons name="sparkles" size={48} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* 4. Text Content Area (Fades In) */}
          <Animated.View style={contentAnimatedStyle} className="w-full items-center">
            
            {/* Typewriter Color Name */}
            <View className="flex-row items-center mb-4">
              <Text className="text-4xl font-bold text-white tracking-wider">
                {auraData.colorName.substring(0, displayedChars)}
              </Text>
              <Animated.Text 
                className="text-4xl font-bold text-white ml-1"
                style={{ opacity: cursorOpacity }}
              >
                |
              </Animated.Text>
            </View>

            {/* Description */}
            <Text className="text-center text-gray-400 text-lg leading-7 mb-8">
              {auraData.description}
            </Text>

            {/* Action Buttons */}
            <View className="w-full gap-4">
              <Pressable 
                onPress={handleShare}
                className="bg-white rounded-2xl p-4 flex-row items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Ionicons name="share-outline" size={24} color="#000" />
                <Text className="ml-2 font-semibold text-black text-lg">Share Result</Text>
              </Pressable>
              
              <Pressable 
                onPress={() => router.replace('/(protected)/home')}
                className="border border-gray-700 rounded-2xl p-4 flex-row items-center justify-center active:bg-gray-800"
              >
                <Text className="font-semibold text-white text-lg">Scan Again</Text>
              </Pressable>
            </View>

          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}