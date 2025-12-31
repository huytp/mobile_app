import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,

  // Initialize auth state from storage
  init: async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const userDataStr = await AsyncStorage.getItem(USER_DATA_KEY);

      if (token && userDataStr) {
        const userData = JSON.parse(userDataStr);
        set({
          token,
          user: userData,
          isAuthenticated: true,
          loading: false,
        });
        return { token, user: userData };
      } else {
        set({ loading: false });
        return null;
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false });
      return null;
    }
  },

  // Register
  registerStart: () => set({ loading: true, error: null }),

  registerSuccess: async (userData, token) => {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

    set({
      user: userData,
      token,
      isAuthenticated: true,
      loading: false,
      error: null,
    });
  },

  registerFailure: (error) =>
    set({
      isAuthenticated: false,
      loading: false,
      error: error,
    }),

  // Login
  loginStart: () => set({ loading: true, error: null }),

  loginSuccess: async (userData, token) => {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

    set({
      user: userData,
      token,
      isAuthenticated: true,
      loading: false,
      error: null,
    });
  },

  loginFailure: (error) =>
    set({
      isAuthenticated: false,
      loading: false,
      error: error,
    }),

  // Logout
  logout: async () => {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;

