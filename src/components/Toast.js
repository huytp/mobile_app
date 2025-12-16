import { Alert } from 'react-native';

const Toast = {
  success: (message) => {
    Alert.alert('Success', message);
  },
  fail: (message) => {
    Alert.alert('Error', message);
  },
  info: (message) => {
    Alert.alert('Info', message);
  },
};

export default Toast;

