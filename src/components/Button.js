import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

const Button = ({
  children,
  onPress,
  type = 'primary',
  loading = false,
  disabled = false,
  size = 'medium',
  style
}) => {
  const buttonStyle = [
    styles.button,
    styles[type],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`${type}Text`],
    styles[`${size}Text`],
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={type === 'primary' ? '#fff' : '#1890ff'}
          size="small"
        />
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primary: {
    backgroundColor: '#1890ff',
  },
  warning: {
    backgroundColor: '#faad14',
  },
  disabled: {
    opacity: 0.5,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 32,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
  },
  warningText: {
    color: '#fff',
  },
  mediumText: {
    fontSize: 16,
  },
  smallText: {
    fontSize: 14,
  },
});

export default Button;

