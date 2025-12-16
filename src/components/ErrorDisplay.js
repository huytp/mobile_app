import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Card from './Card';
import Button from './Button';

const ErrorDisplay = ({ message, onRetry }) => {
  return (
    <Card style={styles.card}>
      <Text style={styles.errorText}>⚠️ {message}</Text>
      {onRetry && (
        <Button type="primary" onPress={onRetry} style={styles.retryButton}>
          Retry
        </Button>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  errorText: {
    color: '#ff4d4f',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    marginTop: 8,
  },
});

export default ErrorDisplay;

