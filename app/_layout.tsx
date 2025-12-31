import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import useAuthStore from '../src/store/authStore';
import api from '../src/services/api';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { init, token } = useAuthStore();

  useEffect(() => {
    // Initialize auth state from storage
    init().then((result) => {
      // Set auth token in API service if available
      if (result?.token) {
        api.setAuthToken(result.token);
      }
    });
  }, []);

  useEffect(() => {
    // Update API token when auth token changes
    if (token) {
      api.setAuthToken(token);
    } else {
      api.setAuthToken(null);
    }
  }, [token]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor="#0a1628" />
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

