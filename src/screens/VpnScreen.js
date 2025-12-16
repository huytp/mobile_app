import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useVpnStore from '../store/vpnStore';
import useWalletStore from '../store/walletStore';
import api from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import Toast from '../components/Toast';

const VpnScreen = () => {
  const {
    status,
    connectionId,
    entryNode,
    exitNode,
    routeScore,
    error,
    connectStart,
    connectSuccess,
    connectFailure,
    disconnectStart,
    disconnectSuccess,
    disconnectFailure,
  } = useVpnStore();
  const { address, connected } = useWalletStore();

  useEffect(() => {
    if (error) {
      Toast.fail(error);
    }
  }, [error]);

  const handleConnect = async () => {
    connectStart();
    try {
      // Gửi address nếu có wallet, nếu không thì gửi null
      const result = await api.connectVPN(connected && address ? address : null);
      connectSuccess(result);
      Toast.success('VPN Connected');
    } catch (err) {
      connectFailure(err.message);
    }
  };

  const handleDisconnect = async () => {
    if (!connectionId) {
      return;
    }

    disconnectStart();
    try {
      await api.disconnectVPN(connectionId);
      disconnectSuccess();
      Toast.success('VPN Disconnected');
    } catch (err) {
      disconnectFailure(err.message);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#52c41a';
      case 'connecting':
      case 'disconnecting':
        return '#faad14';
      default:
        return '#ff4d4f';
    }
  };

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>

        {status === 'connected' && (
          <View style={styles.infoContainer}>
            <Text style={styles.label}>Connection ID:</Text>
            <Text style={styles.value}>{connectionId}</Text>

            <Text style={styles.label}>Entry Node:</Text>
            <Text style={styles.value}>{entryNode}</Text>

            <Text style={styles.label}>Exit Node:</Text>
            <Text style={styles.value}>{exitNode}</Text>

            {routeScore && (
              <>
                <Text style={styles.label}>Route Score:</Text>
                <Text style={styles.value}>{(routeScore * 100).toFixed(2)}%</Text>
              </>
            )}
          </View>
        )}

        <View style={styles.buttonContainer}>
          {status === 'connected' ? (
            <Button
              type="warning"
              onPress={handleDisconnect}
              loading={status === 'disconnecting'}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              type="primary"
              onPress={handleConnect}
              loading={status === 'connecting'}
            >
              Connect VPN
            </Button>
          )}
        </View>
      </Card>
    </View>
  );
};

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    marginTop: 20,
  },
  warningText: {
    color: '#faad14',
    textAlign: 'center',
  },
});

export default VpnScreen;

