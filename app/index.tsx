import { useEffect } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import useAuthStore from "../src/store/authStore";
import { COLORS } from "../src/utils/constants";

export default function Index() {
  const { isAuthenticated, loading } = useAuthStore();

  useEffect(() => {
    // Initialize auth if not already done
    if (!loading) {
      useAuthStore.getState().init();
    }
  }, []);

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Redirect based on authentication status
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/vpn" />;
  } else {
    return <Redirect href="/login" />;
  }
}
