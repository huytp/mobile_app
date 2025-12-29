import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import WireGuard VPN Connect (may not be available in Expo Go)
let WireGuardVpnConnect = null;
try {
  WireGuardVpnConnect = require('react-native-wireguard-vpn-connect').default || require('react-native-wireguard-vpn-connect');
} catch (err) {
  console.warn('WireGuard VPN Connect module not available:', err.message);
}
import useVpnStore from '../store/vpnStore';
import useWalletStore from '../store/walletStore';
import api from '../services/api';
import networkSpeed from '../services/networkSpeed';
import Toast from '../components/Toast';
import { COLORS } from '../utils/constants';

const VpnScreen = () => {
  const {
    status,
    connectionId,
    entryNode,
    exitNode,
    routeScore,
    wireguardConfig,
    clientPrivateKey,
    wireguardError,
    error,
    connectStart,
    connectSuccess,
    connectFailure,
    disconnectStart,
    disconnectSuccess,
    disconnectFailure,
  } = useVpnStore();
  const { address, connected } = useWalletStore();
  const [connectionTime, setConnectionTime] = useState(0);
  const [networkStats, setNetworkStats] = useState({
    downloadSpeed: 0,
    uploadSpeed: 0,
    latency: 0,
    totalTraffic: 0,
    currentSpeed: 0,
  });
  const [isMeasuringSpeed, setIsMeasuringSpeed] = useState(false);
  const [wireguardAvailable, setWireguardAvailable] = useState(false);

  // Check if WireGuard library is available (won't work in Expo Go)
  useEffect(() => {
    const checkWireguardAvailability = () => {
      try {
        // Check if the module is available and has required methods
        const isAvailable = WireGuardVpnConnect &&
                            typeof WireGuardVpnConnect.connect === 'function' &&
                            typeof WireGuardVpnConnect.disconnect === 'function';
        setWireguardAvailable(isAvailable);

        if (!isAvailable) {
          console.warn('WireGuard VPN Connect not available. This requires a development build (not Expo Go).');
        }
      } catch (err) {
        console.warn('WireGuard VPN Connect not available (likely using Expo Go):', err);
        setWireguardAvailable(false);
      }
    };
    checkWireguardAvailability();
  }, []);

  // Request VPN permission when app opens (if WireGuard is available)
  useEffect(() => {
    const requestVpnPermissionOnMount = async () => {
      // Check if WireGuard module is available
      if (!WireGuardVpnConnect) {
        return;
      }

      try {
        // Check if requestVpnPermission method exists
        if (typeof WireGuardVpnConnect.requestVpnPermission === 'function') {
          console.log('Requesting VPN permission on app startup...');
          await WireGuardVpnConnect.requestVpnPermission();
          console.log('VPN permission requested successfully');
        }
      } catch (err) {
        // Permission request failed - this is okay, user might have already granted it
        // or will be prompted when they try to connect
        console.log('VPN permission request on startup:', err?.message || 'Permission may already be granted');
      }
    };

    // Request permission after a short delay to ensure app is fully loaded
    // Only request if WireGuard is available
    if (wireguardAvailable) {
      const timer = setTimeout(() => {
        requestVpnPermissionOnMount();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [wireguardAvailable]);

  useEffect(() => {
    if (error) {
      Toast.fail(error);
    }
  }, [error]);

  useEffect(() => {
    let interval;
    if (status === 'connected') {
      interval = setInterval(() => {
        setConnectionTime((prev) => prev + 1);
      }, 1000);
    } else {
      setConnectionTime(0);
      setNetworkStats({
        downloadSpeed: 0,
        uploadSpeed: 0,
        latency: 0,
        totalTraffic: 0,
        currentSpeed: 0,
      });
    }
    return () => clearInterval(interval);
  }, [status]);

  // Đo tốc độ mạng định kỳ khi connected
  useEffect(() => {
    let speedInterval;
    let statsInterval;

    if (status === 'connected' && connectionId) {
      // Đo tốc độ mạng mỗi 10 giây
      const measureSpeed = async () => {
        if (isMeasuringSpeed) return;
        setIsMeasuringSpeed(true);
        try {
          const speedResult = await networkSpeed.measureFullSpeed();
          setNetworkStats((prev) => ({
            ...prev,
            downloadSpeed: speedResult.downloadSpeed || prev.downloadSpeed,
            latency: speedResult.latency || prev.latency,
          }));
        } catch (err) {
          // Speed measurement failed silently
        } finally {
          setIsMeasuringSpeed(false);
        }
      };

      // Lấy stats từ backend mỗi 5 giây
      const fetchStats = async () => {
        try {
          const stats = await api.getConnectionStats(connectionId);
          if (stats) {
            setNetworkStats((prev) => ({
              ...prev,
              totalTraffic: stats.total_traffic_mb || 0,
              currentSpeed: stats.current_speed_mbps || 0,
            }));
          }
        } catch (err) {
          // Stats fetch failed silently
        }
      };

      // Đo ngay lập tức
      measureSpeed();
      fetchStats();

      // Đo định kỳ
      speedInterval = setInterval(measureSpeed, 10000); // Mỗi 10 giây
      statsInterval = setInterval(fetchStats, 5000); // Mỗi 5 giây
    }

    return () => {
      if (speedInterval) clearInterval(speedInterval);
      if (statsInterval) clearInterval(statsInterval);
    };
  }, [status, connectionId, isMeasuringSpeed]);

  const handleConnect = async () => {
    connectStart();
    try {
      // Step 1: Get VPN connection from backend
      const result = await api.connectVPN(connected && address ? address : null);

      // Step 2: Check if wireguard config is available
      if (!result.wireguard_config) {
        if (result.wireguard_error) {
          const errorMsg = `WireGuard config unavailable: ${result.wireguard_error}`;
          connectFailure(errorMsg);
          Toast.fail(errorMsg);
        } else {
          const errorMsg = 'WireGuard config unavailable. Check backend logs.';
          connectFailure(errorMsg);
          Toast.fail(errorMsg);
        }
        return;
      }

      // Step 3: Connect using react-native-wireguard-vpn-connect
      if (wireguardAvailable) {
        try {
          // Parse WireGuard config string thành object format
          const configObject = parseWireguardConfigForLibrary(result.wireguard_config);

          if (!configObject) {
            throw new Error('Failed to parse WireGuard config');
          }

          console.log('Connecting with config object:', {
            ...configObject,
            privateKey: configObject.privateKey ? `${configObject.privateKey.substring(0, 10)}...` : 'missing',
            publicKey: configObject.publicKey ? `${configObject.publicKey.substring(0, 10)}...` : 'missing',
          });

          // Try to connect
          try {
            await WireGuardVpnConnect.connect(configObject);

            // Step 4: Update store with connection info
            connectSuccess(result);
            Toast.success('VPN Connected');
          } catch (connectError) {
            // Check if it's a permission error
            const errorMessage = connectError?.message || '';
            if (errorMessage.includes('VPN_PERMISSION_REQUIRED') || errorMessage.includes('VPN permission')) {
              // Request VPN permission first
              try {
                await WireGuardVpnConnect.requestVpnPermission();
                // After permission is granted, try connecting again
                await WireGuardVpnConnect.connect(configObject);

                connectSuccess(result);
                Toast.success('VPN Connected');
              } catch (permissionError) {
                throw new Error(`VPN permission required: ${permissionError?.message || 'Please grant VPN permission in system settings'}`);
              }
            } else {
              throw connectError;
            }
          }
        } catch (wgError) {
          // WireGuard connection failed, but backend connection succeeded
          // Still update store but show warning
          connectSuccess(result);
          const wgErrorMsg = wgError?.message || 'Failed to establish WireGuard tunnel';
          Toast.fail(`Backend connected but WireGuard failed: ${wgErrorMsg}`);
          console.error('WireGuard connection error:', wgError);
        }
      } else {
        // WireGuard library not available (likely Expo Go)
        // Still update store but show info message
        connectSuccess(result);
        Toast.success('Backend connected. WireGuard tunnel requires development build.');
        Alert.alert(
          'Development Build Required',
          'To use native WireGuard VPN connection, you need to:\n\n' +
          '1. Run: npx expo prebuild\n' +
          '2. Build development build (not Expo Go)\n' +
          '3. Install on device\n\n' +
          'For now, you can manually import the config to WireGuard app.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to connect VPN';
      connectFailure(errorMessage);
      Toast.fail(errorMessage);
    }
  };

  const handleDisconnect = async () => {
    if (!connectionId) {
      return;
    }

    disconnectStart();
    try {
      // Step 1: Disconnect WireGuard VPN tunnel (if available)
      if (wireguardAvailable) {
        try {
          await WireGuardVpnConnect.disconnect();
        } catch (wgError) {
          console.error('WireGuard disconnect error:', wgError);
          // Continue with backend disconnect even if WireGuard disconnect fails
        }
      }

      // Step 2: Disconnect from backend
      await api.disconnectVPN(connectionId);
      disconnectSuccess();
      Toast.success('VPN Disconnected');
    } catch (err) {
      disconnectFailure(err.message);
      Toast.fail(`Disconnect error: ${err.message}`);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return COLORS.success;
      case 'connecting':
      case 'disconnecting':
        return COLORS.warning;
      default:
        return COLORS.error;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnecting':
        return 'Disconnecting...';
      default:
        return 'Disconnected';
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleConnection = () => {
    if (status === 'connected') {
      handleDisconnect();
    } else if (status === 'disconnected') {
      handleConnect();
    }
  };

  // Parse WireGuard config string thành object format cho react-native-wireguard-vpn-connect
  const parseWireguardConfigForLibrary = (configString) => {
    if (!configString) return null;

    try {
      const cleanConfig = configString
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .join('\n');

      const result = {};

      // Parse [Interface] section
      const interfaceMatch = cleanConfig.match(/\[Interface\]([\s\S]*?)(?=\[Peer\]|$)/i);
      if (interfaceMatch) {
        const interfaceSection = interfaceMatch[1];

        // PrivateKey
        const privateKeyMatch = interfaceSection.match(/PrivateKey\s*=\s*([^\r\n]+)/i);
        if (privateKeyMatch) {
          result.privateKey = privateKeyMatch[1].trim();
        }

        // DNS - có thể có nhiều DNS servers, split by comma
        const dnsMatch = interfaceSection.match(/DNS\s*=\s*([^\r\n]+)/i);
        if (dnsMatch) {
          const dnsString = dnsMatch[1].trim();
          result.dns = dnsString.split(',').map(d => d.trim()).filter(d => d);
        }

        // Address - dùng để tạo allowedIPs nếu cần
        const addressMatch = interfaceSection.match(/Address\s*=\s*([^\r\n]+)/i);
        if (addressMatch) {
          result.clientAddress = addressMatch[1].trim();
        }
      }

      // Parse [Peer] section
      const peerMatch = cleanConfig.match(/\[Peer\]([\s\S]*?)$/i);
      if (peerMatch) {
        const peerSection = peerMatch[1];

        // PublicKey
        const publicKeyMatch = peerSection.match(/PublicKey\s*=\s*([^\r\n]+)/i);
        if (publicKeyMatch) {
          result.publicKey = publicKeyMatch[1].trim();
        }

        // Endpoint - parse thành serverAddress và serverPort
        const endpointMatch = peerSection.match(/Endpoint\s*=\s*([^\r\n]+)/i);
        if (endpointMatch) {
          const endpoint = endpointMatch[1].trim();
          const [address, port] = endpoint.split(':');
          if (address && port) {
            result.serverAddress = address.trim();
            result.serverPort = parseInt(port.trim(), 10);
          }
        }

        // AllowedIPs - có thể có nhiều IPs, split by comma
        const allowedIPsMatch = peerSection.match(/AllowedIPs\s*=\s*([^\r\n]+)/i);
        if (allowedIPsMatch) {
          const allowedIPsString = allowedIPsMatch[1].trim();
          result.allowedIPs = allowedIPsString.split(',').map(ip => ip.trim()).filter(ip => ip);
        }

        // PresharedKey (optional)
        const presharedKeyMatch = peerSection.match(/PresharedKey\s*=\s*([^\r\n]+)/i);
        if (presharedKeyMatch) {
          result.presharedKey = presharedKeyMatch[1].trim();
        }
      }

      // Validate required fields
      if (!result.privateKey || !result.publicKey || !result.serverAddress || !result.serverPort || !result.allowedIPs) {
        throw new Error('Missing required fields in WireGuard config');
      }

      return result;
    } catch (err) {
      console.error('Failed to parse WireGuard config:', err);
      throw new Error(`Failed to parse WireGuard config: ${err.message}`);
    }
  };

  // Parse WireGuard config để hiển thị thông tin chi tiết
  const parseWireguardConfig = (config) => {
    if (!config) return {};

    const info = {};

    try {
      // Loại bỏ comment lines và normalize whitespace
      const cleanConfig = config
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .join('\n');

      // Parse Interface section
      const interfaceMatch = cleanConfig.match(/\[Interface\]([\s\S]*?)(?=\[Peer\]|$)/i);
      if (interfaceMatch) {
        const interfaceSection = interfaceMatch[1];

        // Address - match cả với /24 hoặc CIDR notation
        const addressMatch = interfaceSection.match(/Address\s*=\s*([^\r\n]+)/i);
        if (addressMatch) info.clientIP = addressMatch[1].trim();

        // PrivateKey
        const privateKeyMatch = interfaceSection.match(/PrivateKey\s*=\s*([^\r\n]+)/i);
        if (privateKeyMatch) info.privateKey = privateKeyMatch[1].trim();

        // DNS
        const dnsMatch = interfaceSection.match(/DNS\s*=\s*([^\r\n]+)/i);
        if (dnsMatch) info.dns = dnsMatch[1].trim();
      }

      // Parse Peer section
      const peerMatch = cleanConfig.match(/\[Peer\]([\s\S]*?)$/i);
      if (peerMatch) {
        const peerSection = peerMatch[1];

        // PublicKey
        const publicKeyMatch = peerSection.match(/PublicKey\s*=\s*([^\r\n]+)/i);
        if (publicKeyMatch) info.serverPublicKey = publicKeyMatch[1].trim();

        // Endpoint
        const endpointMatch = peerSection.match(/Endpoint\s*=\s*([^\r\n]+)/i);
        if (endpointMatch) info.endpoint = endpointMatch[1].trim();

        // AllowedIPs
        const allowedIPsMatch = peerSection.match(/AllowedIPs\s*=\s*([^\r\n]+)/i);
        if (allowedIPsMatch) info.allowedIPs = allowedIPsMatch[1].trim();

        // PersistentKeepalive
        const persistentKeepaliveMatch = peerSection.match(/PersistentKeepalive\s*=\s*([^\r\n]+)/i);
        if (persistentKeepaliveMatch) info.keepalive = persistentKeepaliveMatch[1].trim();
      }
    } catch (err) {
      // Config parsing failed
    }

    return info;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.containerContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Status Text */}
      <View style={styles.statusHeader}>
        <Text style={styles.statusLabel}>Status: </Text>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Main Circular Button */}
      <View style={styles.circleContainer}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={handleToggleConnection}
          disabled={status === 'connecting' || status === 'disconnecting'}
          activeOpacity={0.8}
        >
          <View style={[
            styles.gradientBorder,
            { backgroundColor: status === 'connected' ? COLORS.gradientStart : COLORS.textMuted }
          ]}>
            <View style={styles.circleInner}>
              <MaterialCommunityIcons
                name={status === 'connected' ? 'lock' : 'lock-open'}
                size={48}
                color={status === 'connected' ? COLORS.gradientStart : COLORS.textMuted}
              />
              <Text style={styles.buttonText}>
                {status === 'connected' ? 'STOP' : 'START'}
              </Text>
              {status === 'connected' && (
                <Text style={styles.timerText}>{formatTime(connectionTime)}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Connection Info */}
      {status === 'connected' && (
        <View style={styles.connectionInfo}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="server-network" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoLabel}>Entry: </Text>
            <Text style={styles.infoValue}>{entryNode?.slice(0, 12)}...</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="server-network-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoLabel}>Exit: </Text>
            <Text style={styles.infoValue}>{exitNode?.slice(0, 12)}...</Text>
          </View>
          {routeScore && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="chart-line" size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>Score: </Text>
              <Text style={styles.infoValue}>{(routeScore * 100).toFixed(1)}%</Text>
            </View>
          )}

          {/* Network Speed Stats */}
          <View style={styles.speedSection}>
            <Text style={styles.speedTitle}>Network Speed</Text>
            <View style={styles.speedGrid}>
              <View style={styles.speedCard}>
                <MaterialCommunityIcons name="download" size={24} color={COLORS.primary} />
                <Text style={styles.speedValue}>
                  {networkStats.downloadSpeed > 0
                    ? `${networkStats.downloadSpeed.toFixed(2)} Mbps`
                    : networkStats.currentSpeed > 0
                    ? `${networkStats.currentSpeed.toFixed(2)} Mbps`
                    : '--'}
                </Text>
                <Text style={styles.speedLabel}>Download</Text>
              </View>
              <View style={styles.speedCard}>
                <MaterialCommunityIcons name="speedometer" size={24} color={COLORS.success} />
                <Text style={styles.speedValue}>
                  {networkStats.latency > 0 ? `${networkStats.latency} ms` : '--'}
                </Text>
                <Text style={styles.speedLabel}>Latency</Text>
              </View>
            </View>
            {networkStats.totalTraffic > 0 && (
              <View style={styles.trafficRow}>
                <MaterialCommunityIcons name="database" size={16} color={COLORS.textSecondary} />
                <Text style={styles.trafficText}>
                  Total Traffic: {networkStats.totalTraffic.toFixed(2)} MB
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  containerContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  statusLabel: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '400',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  circleButton: {
    width: 280,
    height: 280,
  },
  gradientBorder: {
    width: 280,
    height: 280,
    borderRadius: 140,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: 264,
    height: 264,
    borderRadius: 132,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
  },
  timerText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  connectionInfo: {
    marginVertical: 20,
    alignItems: 'center',
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  speedSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    width: '100%',
  },
  speedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  speedGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  speedCard: {
    alignItems: 'center',
    flex: 1,
  },
  speedValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  speedLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  trafficRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundLight,
  },
  trafficText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
});

export default VpnScreen;
