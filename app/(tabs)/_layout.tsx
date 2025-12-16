import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1890ff',
        tabBarInactiveTintColor: '#999',
        headerStyle: {
          backgroundColor: '#1890ff',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="vpn"
        options={{
          title: 'VPN',
          tabBarLabel: 'VPN',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>🛡️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarLabel: 'Rewards',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>🎁</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>💼</Text>
          ),
        }}
      />
    </Tabs>
  );
}

