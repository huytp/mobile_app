import 'react-native-gesture-handler';
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { Provider as AntProvider } from '@ant-design/react-native';

export default function App() {
  return (
    <AntProvider>
      <Provider store={store}>
        <AppNavigator />
      </Provider>
    </AntProvider>
  );
}

