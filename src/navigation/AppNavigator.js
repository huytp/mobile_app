import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import VpnScreen from '../screens/VpnScreen';
import RewardScreen from '../screens/RewardScreen';
import WalletScreen from '../screens/WalletScreen';
// Note: Icon component may need to be imported differently
// Using simple text icons for now

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#1890ff',
          tabBarInactiveTintColor: '#999',
          headerStyle: {
            backgroundColor: '#1890ff',
          },
          headerTintColor: '#fff',
        }}
      >
        <Tab.Screen
          name="VPN"
          component={VpnScreen}
          options={{
            tabBarLabel: 'VPN',
          }}
        />
        <Tab.Screen
          name="Rewards"
          component={RewardScreen}
          options={{
            tabBarLabel: 'Rewards',
          }}
        />
        <Tab.Screen
          name="Wallet"
          component={WalletScreen}
          options={{
            tabBarLabel: 'Wallet',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

