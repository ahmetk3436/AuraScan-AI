import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../lib/storage';
import { hapticSuccess, hapticError } from '../lib/haptics';
import type { User, AuthResponse } from '../types/auth';

const GUEST_USAGE_KEY = 'guest_usage_count';
const GUEST_MODE_KEY = 'guest_mode';
const MAX_GUEST_SCANS = 3;

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  user: User | null;
  guestUsageCount: number;
  canUseFeature: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithApple: (identityToken: string, authCode: string, fullName?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  incrementGuestUsage: () => Promise<number>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(0);

  const isAuthenticated = user !== null;

  useEffect(() => {
    const restore = async () => {
      try {
        // Check guest mode
        const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
        if (guestMode === 'true') {
          setIsGuest(true);
          const usage = await AsyncStorage.getItem(GUEST_USAGE_KEY);
          setGuestUsageCount(usage ? parseInt(usage, 10) : 0);
        }

        // Check auth token
        const token = await getAccessToken();
        if (token) {
          const { data } = await api.get('/health');
          if (data.status === 'ok') {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({ id: payload.sub, email: payload.email });
            // If user is authenticated, exit guest mode
            setIsGuest(false);
          }
        }
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const canUseFeature = useCallback(() => {
    if (isAuthenticated) return true;
    return guestUsageCount < MAX_GUEST_SCANS;
  }, [isAuthenticated, guestUsageCount]);

  const incrementGuestUsage = useCallback(async () => {
    const newCount = guestUsageCount + 1;
    setGuestUsageCount(newCount);
    await AsyncStorage.setItem(GUEST_USAGE_KEY, String(newCount));
    return newCount;
  }, [guestUsageCount]);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    await AsyncStorage.setItem('onboarding_complete', 'true');
    setIsGuest(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      hapticSuccess();
    } catch (err) {
      hapticError();
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', { email, password });
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      hapticSuccess();
    } catch (err) {
      hapticError();
      throw err;
    }
  }, []);

  const loginWithApple = useCallback(
    async (identityToken: string, authCode: string, fullName?: string, email?: string) => {
      try {
        const { data } = await api.post<AuthResponse>('/auth/apple', {
          identity_token: identityToken,
          authorization_code: authCode,
          full_name: fullName,
          email,
        });
        await setTokens(data.access_token, data.refresh_token);
        setUser(data.user);
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        hapticSuccess();
      } catch (err) {
        hapticError();
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore logout API errors
    } finally {
      await clearTokens();
      setUser(null);
    }
  }, []);

  const deleteAccount = useCallback(
    async (password?: string) => {
      await api.delete('/auth/account', {
        data: { password: password || '' },
      });
      await clearTokens();
      setUser(null);
      hapticSuccess();
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isGuest,
        user,
        guestUsageCount,
        canUseFeature,
        login,
        register,
        loginWithApple,
        logout,
        deleteAccount,
        continueAsGuest,
        incrementGuestUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
