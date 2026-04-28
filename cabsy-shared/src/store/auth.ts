import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import type {User, UserRole} from '../shared/types';

const STORAGE_KEYS = {
  accessToken: 'cabsy.accessToken',
  refreshToken: 'cabsy.refreshToken',
  user: 'cabsy.user',
  role: 'cabsy.role',
} as const;

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  role: UserRole | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (tokens: AuthTokens, user: User, role: UserRole) => Promise<void>;
  setUser: (user: User) => void;
  setRole: (role: UserRole) => void;
  logout: () => Promise<void>;
}

const isUserRole = (value: string | null): value is UserRole =>
  value === 'rider' || value === 'driver';

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  role: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    const entries = await AsyncStorage.multiGet([
      STORAGE_KEYS.accessToken,
      STORAGE_KEYS.refreshToken,
      STORAGE_KEYS.user,
      STORAGE_KEYS.role,
    ]);
    const map = new Map(entries);
    const accessToken = map.get(STORAGE_KEYS.accessToken) ?? null;
    const refreshToken = map.get(STORAGE_KEYS.refreshToken) ?? null;
    const userRaw = map.get(STORAGE_KEYS.user) ?? null;
    const roleRaw = map.get(STORAGE_KEYS.role) ?? null;

    let user: User | null = null;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw) as User;
      } catch {
        user = null;
      }
    }
    const role: UserRole | null = isUserRole(roleRaw) ? roleRaw : null;

    set({
      accessToken,
      refreshToken,
      user,
      role,
      hydrated: true,
    });
  },

  login: async (tokens, user, role) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.accessToken, tokens.access],
      [STORAGE_KEYS.refreshToken, tokens.refresh],
      [STORAGE_KEYS.user, JSON.stringify(user)],
      [STORAGE_KEYS.role, role],
    ]);
    set({
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      user,
      role,
    });
  },

  setUser: user => {
    set({user});
    void AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  },

  setRole: role => {
    set({role});
    void AsyncStorage.setItem(STORAGE_KEYS.role, role);
  },

  logout: async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.accessToken,
      STORAGE_KEYS.refreshToken,
      STORAGE_KEYS.user,
      STORAGE_KEYS.role,
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      role: null,
    });
  },
}));
