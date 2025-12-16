import { useEffect } from "react";
import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to VPN tab as the default screen
  return <Redirect href="/(tabs)/vpn" />;
}
