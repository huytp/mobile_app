import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import VpnScreen from '../screens/VpnScreen';
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
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

