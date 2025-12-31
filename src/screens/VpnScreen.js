import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useRouter } from 'expo-router';

const VpnScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [subscription, setSubscription] = useState(null);
  const [networkStats, setNetworkStats] = useState({
    downloadSpeed: 0,
    uploadSpeed: 0,
    latency: 0,
    totalTraffic: 0,
    currentSpeed: 0,
  });
  const [isMeasuringSpeed, setIsMeasuringSpeed] = useState(false);
  const [wireguardAvailable, setWireguardAvailable] = useState(false);
  const [publicIP, setPublicIP] = useState(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculate bottom padding to avoid tab bar (tab bar height: 70 + insets.bottom)
  const tabBarHeight = 70 + insets.bottom;

  // Fetch public IP address
  const fetchPublicIP = async () => {
    try {
      // Try multiple services for reliability
      const services = [
        { url: 'https://api.ipify.org?format=json', isJson: true },
        { url: 'https://api64.ipify.org?format=json', isJson: true },
        { url: 'https://ifconfig.me/ip', isJson: false },
      ];

      for (const service of services) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(service.url, {
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            if (service.isJson) {
              const data = await response.json();
              const ip = data.ip;
              if (ip) {
                setPublicIP(ip);
                return;
              }
            } else {
              const text = await response.text();
              const ip = text.trim();
              if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
                setPublicIP(ip);
                return;
              }
            }
          }
        } catch (err) {
          // Try next service
          continue;
        }
      }
      // If all services failed, set to N/A
      setPublicIP('N/A');
    } catch (err) {
      console.warn('Failed to fetch public IP:', err);
      setPublicIP('N/A');
    }
  };

  // Fetch public IP on mount
  useEffect(() => {
    fetchPublicIP();
    loadSubscription();
  }, []);

  // Load subscription status
  const loadSubscription = async () => {
    try {
      const data = await api.getSubscriptionStatus();
      setSubscription(data.subscription);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

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

  // Update public IP when VPN status changes
  useEffect(() => {
    let timer1, timer2;

    if (status === 'connected') {
      // Wait a bit for VPN tunnel to fully establish before checking IP
      // Use longer delay to ensure tunnel is fully established
      timer1 = setTimeout(() => {
        fetchPublicIP();
        // Also retry after a bit more time in case first check was too early
        timer2 = setTimeout(() => {
          fetchPublicIP();
        }, 3000);
      }, 3000);
    } else if (status === 'disconnected') {
      // Update IP after a short delay when disconnected to allow tunnel to close
      timer1 = setTimeout(() => {
        fetchPublicIP();
      }, 1500);
    }

    return () => {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
    };
  }, [status]);

  // Pulse animation when connected
  useEffect(() => {
    if (status === 'connected') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  // Fade in animation for connection info
  useEffect(() => {
    if (status === 'connected') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [status]);

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
    // Check subscription first
    try {
      const subscriptionData = await api.getSubscriptionStatus();
      setSubscription(subscriptionData.subscription);

      if (!subscriptionData.subscription?.active) {
        Alert.alert(
          'Subscription Required',
          'You need an active subscription to use VPN. Please subscribe to continue.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Go to Subscription',
              onPress: () => router.push('/(tabs)/subscription'),
            },
          ]
        );
        return;
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // If API fails, still allow connection attempt
    }

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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.containerContent,
          { paddingBottom: tabBarHeight + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusLabel}>STATUS</Text>
          </View>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>

          {/* Public IP Card */}
          <View style={styles.ipCard}>
            <MaterialCommunityIcons name="earth" size={18} color={COLORS.primary} />
            <View style={styles.ipInfo}>
              <Text style={styles.ipLabelSmall}>Your IP Address</Text>
              <Text style={styles.ipValueLarge}>{publicIP || 'Detecting...'}</Text>
            </View>
            <MaterialCommunityIcons
              name={status === 'connected' ? 'shield-check' : 'shield-alert'}
              size={24}
              color={status === 'connected' ? COLORS.success : COLORS.textSecondary}
            />
          </View>
        </View>

        {/* Main Circular Button */}
        <View style={styles.circleContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={handleToggleConnection}
              disabled={status === 'connecting' || status === 'disconnecting'}
              activeOpacity={0.8}
            >
              <View style={[
                styles.gradientBorder,
                {
                  backgroundColor: status === 'connected' ? COLORS.success : '#2a2e45',
                  borderColor: status === 'connected' ? COLORS.success : '#3a3e55'
                }
              ]}>
                <View style={styles.circleInner}>
                  <MaterialCommunityIcons
                    name={status === 'connected' ? 'shield-check' : 'shield-off-outline'}
                    size={56}
                    color={status === 'connected' ? COLORS.success : COLORS.textSecondary}
                  />
                  <Text style={[styles.buttonText, {
                    color: status === 'connected' ? COLORS.success : COLORS.text
                  }]}>
                    {status === 'connected' ? 'PROTECTED' : status === 'connecting' ? 'CONNECTING' : 'TAP TO CONNECT'}
                  </Text>
                  {status === 'connected' && (
                    <Text style={styles.timerText}>{formatTime(connectionTime)}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

      {/* Connection Info */}
      {status === 'connected' && (
        <Animated.View style={[styles.connectionInfo, { opacity: fadeAnim }]}>
          {/* Route Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>
              <MaterialCommunityIcons name="routes" size={18} color={COLORS.primary} /> Route Information
            </Text>

            <View style={styles.routeItem}>
              <View style={styles.routeIconContainer}>
                <MaterialCommunityIcons name="server-network" size={20} color={COLORS.success} />
              </View>
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Entry Node</Text>
                <Text style={styles.routeValue}>{entryNode?.slice(0, 16)}...</Text>
              </View>
            </View>

            <View style={styles.routeDivider}>
              <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </View>

            <View style={styles.routeItem}>
              <View style={styles.routeIconContainer}>
                <MaterialCommunityIcons name="server-network-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Exit Node</Text>
                <Text style={styles.routeValue}>{exitNode?.slice(0, 16)}...</Text>
              </View>
            </View>

            {routeScore && (
              <View style={styles.scoreContainer}>
                <MaterialCommunityIcons name="chart-line" size={16} color={COLORS.warning} />
                <Text style={styles.scoreLabel}>Route Score: </Text>
                <Text style={styles.scoreValue}>{(routeScore * 100).toFixed(1)}%</Text>
              </View>
            )}
          </View>

          {/* Network Speed Stats */}
          <View style={styles.speedSection}>
            <Text style={styles.cardTitle}>
              <MaterialCommunityIcons name="speedometer" size={18} color={COLORS.primary} /> Network Performance
            </Text>

            <View style={styles.speedGrid}>
              <View style={styles.speedCard}>
                <View style={[styles.speedCardGradient, styles.speedCardBlue]}>
                  <MaterialCommunityIcons name="download" size={28} color={COLORS.primary} />
                  <Text style={styles.speedValue}>
                    {networkStats.downloadSpeed > 0
                      ? `${networkStats.downloadSpeed.toFixed(1)}`
                      : networkStats.currentSpeed > 0
                      ? `${networkStats.currentSpeed.toFixed(1)}`
                      : '--'}
                  </Text>
                  <Text style={styles.speedUnit}>Mbps</Text>
                  <Text style={styles.speedLabel}>Download</Text>
                </View>
              </View>

              <View style={styles.speedCard}>
                <View style={[styles.speedCardGradient, styles.speedCardGreen]}>
                  <MaterialCommunityIcons name="speedometer" size={28} color={COLORS.success} />
                  <Text style={styles.speedValue}>
                    {networkStats.latency > 0 ? `${networkStats.latency}` : '--'}
                  </Text>
                  <Text style={styles.speedUnit}>ms</Text>
                  <Text style={styles.speedLabel}>Latency</Text>
                </View>
              </View>
            </View>

            {networkStats.totalTraffic > 0 && (
              <View style={styles.trafficRow}>
                <MaterialCommunityIcons name="database" size={18} color={COLORS.warning} />
                <Text style={styles.trafficText}>
                  Total Data: {networkStats.totalTraffic.toFixed(2)} MB
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1f',
  },
  scrollView: {
    flex: 1,
  },
  containerContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: 'rgba(26, 30, 53, 0.8)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  statusText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  ipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  ipInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ipLabelSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ipValueLarge: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  circleButton: {
    width: 280,
    height: 280,
  },
  gradientBorder: {
    width: 280,
    height: 280,
    borderRadius: 140,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  circleInner: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 20,
    color: COLORS.success,
    marginTop: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  connectionInfo: {
    width: '100%',
  },
  infoCard: {
    backgroundColor: 'rgba(26, 30, 53, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  routeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routeDetails: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  routeValue: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  routeDivider: {
    alignItems: 'center',
    marginVertical: 4,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.15)',
  },
  scoreLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  scoreValue: {
    fontSize: 15,
    color: COLORS.warning,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  speedSection: {
    backgroundColor: 'rgba(26, 30, 53, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  speedGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  speedCard: {
    flex: 1,
  },
  speedCardGradient: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  speedCardBlue: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  speedCardGreen: {
    backgroundColor: '#065f46',
    borderColor: '#10b981',
  },
  speedValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  speedUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  speedLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trafficRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.15)',
  },
  trafficText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default VpnScreen;
