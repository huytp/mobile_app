import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, Platform, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// import * as Clipboard from 'expo-clipboard'; // Temporarily disabled due to native module issues
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
          await WireGuardVpnConnect.connect(result.wireguard_config);

          // Step 4: Update store with connection info
          connectSuccess(result);
          Toast.success('VPN Connected');
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

  const handleCopyConfig = async (config) => {
    try {
      // Using Share API instead of Clipboard (temporarily disabled due to native module issues)
      await Share.share({
        message: config,
        title: 'WireGuard Config'
      });
      Toast.success('WireGuard config shared!');
    } catch (err) {
      console.error('Share error:', err);
      Toast.fail('Failed to share config');
    }
  };

  const handleAutoImport = async (config) => {
    try {
      if (Platform.OS === 'ios') {
        // Tạo file .conf tạm thời
        const fileName = `devpn-${connectionId || 'config'}.conf`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

        // Ghi config vào file
        await FileSystem.writeAsStringAsync(fileUri, config, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // Kiểm tra xem WireGuard app có cài đặt không
        const wireguardUrl = `wireguard://import?config=${encodeURIComponent(config)}`;
        const canOpen = await Linking.canOpenURL(wireguardUrl);

        if (canOpen) {
          // Mở WireGuard app với config
          await Linking.openURL(wireguardUrl);
          Toast.success('Opening WireGuard app...');
        } else {
          // Nếu không có WireGuard app, share file
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/x-wireguard-config',
              dialogTitle: 'Import WireGuard Config',
            });
            Toast.success('Share config file to WireGuard');
          } else {
            // Fallback: share config
            await handleCopyConfig(config);
            Alert.alert(
              'WireGuard App Not Found',
              'Please install WireGuard app from App Store, then:\n\n' +
              '1. Open WireGuard app\n' +
              '2. Tap "+" button\n' +
              '3. Select "Create from file or archive"\n' +
              '4. Use the shared config from the share dialog\n\n' +
              'Or use the Share button to share the config file.',
              [{ text: 'OK' }]
            );
          }
        }
      } else {
        // Android: share và hướng dẫn
        await handleCopyConfig(config);
        Alert.alert(
          'Import WireGuard Config',
          'Config shared!\n\n' +
          '1. Open WireGuard app\n' +
          '2. Tap "+" button\n' +
          '3. Select "Create from file or archive"\n' +
          '4. Use the shared config from the share dialog\n' +
          '5. Save and activate',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      // Fallback to share
      await handleCopyConfig(config);
      Toast.fail('Failed to auto-import. Config shared via Share dialog.');
    }
  };

  const handleImportInstructions = () => {
    Alert.alert(
      'Import WireGuard Config',
      'To use this VPN tunnel:\n\n' +
      '1. Install WireGuard app from App Store\n' +
      '2. Tap "Auto Import" button to open WireGuard app automatically\n' +
      '3. Or copy config and import manually\n\n' +
      'Your network traffic will now route through the VPN node.',
      [{ text: 'OK' }]
    );
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

          {/* Debug Info Section - Always show to debug */}
          <View style={styles.debugSection}>
            <View style={styles.debugHeader}>
              <MaterialCommunityIcons name="bug" size={20} color={COLORS.warning} />
              <Text style={styles.debugTitle}>Debug Info</Text>
            </View>

            <View style={styles.debugContent}>
              <Text style={styles.debugLabel}>Store State:</Text>
              <ScrollView style={styles.debugBox} nestedScrollEnabled>
                <Text style={styles.debugText} selectable>
                  {JSON.stringify({
                    status,
                    connectionId,
                    hasWireguardConfig: !!wireguardConfig,
                    wireguardConfigLength: wireguardConfig?.length || 0,
                    wireguardConfigPreview: wireguardConfig ? wireguardConfig.substring(0, 100) + '...' : 'null',
                    wireguardError: wireguardError || 'none',
                  }, null, 2)}
                </Text>
              </ScrollView>

              {wireguardConfig ? (
                <>
                  <Text style={styles.debugLabel}>WireGuard Config (Full):</Text>
                  <ScrollView style={styles.debugBox} nestedScrollEnabled>
                    <Text style={styles.debugText} selectable>
                      {wireguardConfig}
                    </Text>
                  </ScrollView>

                  <Text style={styles.debugLabel}>Parsed Config Info:</Text>
                  <ScrollView style={styles.debugBox} nestedScrollEnabled>
                    <Text style={styles.debugText} selectable>
                      {JSON.stringify(parseWireguardConfig(wireguardConfig), null, 2)}
                    </Text>
                  </ScrollView>
                </>
              ) : (
                <View style={styles.debugBox}>
                  <Text style={[styles.debugText, { color: COLORS.error, fontWeight: 'bold' }]}>
                    ⚠️ wireguardConfig is NULL or empty
                  </Text>
                  {wireguardError ? (
                    <>
                      <Text style={[styles.debugText, { color: COLORS.error, marginTop: 8 }]}>
                        Backend Error:
                      </Text>
                      <Text style={[styles.debugText, { color: COLORS.error }]} selectable>
                        {wireguardError}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.debugText}>
                      This means the backend did not return wireguard_config in the response.
                      Check backend logs to see why create_wireguard_config failed.
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* WireGuard Config Section */}
          {wireguardConfig && (() => {
            const configInfo = parseWireguardConfig(wireguardConfig);
            const hasConfigInfo = configInfo && Object.keys(configInfo).length > 0;

            return (
              <View style={styles.wireguardSection}>
                <View style={styles.wireguardHeader}>
                  <MaterialCommunityIcons name="vpn" size={24} color={COLORS.primary} />
                  <Text style={styles.wireguardTitle}>WireGuard Tunnel</Text>
                </View>

                {/* Chi tiết config */}
                {hasConfigInfo ? (
                  <View style={styles.configDetails}>
                    {configInfo.clientIP && (
                      <View style={styles.configRow}>
                        <View style={styles.configLabelRow}>
                          <MaterialCommunityIcons name="ip-network" size={16} color={COLORS.textSecondary} />
                          <Text style={styles.configLabel}>Client IP:</Text>
                        </View>
                        <Text style={styles.configValue}>{configInfo.clientIP}</Text>
                      </View>
                    )}
                    {configInfo.endpoint && (
                      <View style={styles.configRow}>
                        <View style={styles.configLabelRow}>
                          <MaterialCommunityIcons name="server" size={16} color={COLORS.textSecondary} />
                          <Text style={styles.configLabel}>Server:</Text>
                        </View>
                        <Text style={styles.configValue}>{configInfo.endpoint}</Text>
                      </View>
                    )}
                    {configInfo.dns && (
                      <View style={styles.configRow}>
                        <View style={styles.configLabelRow}>
                          <MaterialCommunityIcons name="dns" size={16} color={COLORS.textSecondary} />
                          <Text style={styles.configLabel}>DNS:</Text>
                        </View>
                        <Text style={styles.configValue}>{configInfo.dns}</Text>
                      </View>
                    )}
                    {configInfo.allowedIPs && (
                      <View style={styles.configRow}>
                        <View style={styles.configLabelRow}>
                          <MaterialCommunityIcons name="routes" size={16} color={COLORS.textSecondary} />
                          <Text style={styles.configLabel}>Allowed IPs:</Text>
                        </View>
                        <Text style={styles.configValue}>{configInfo.allowedIPs}</Text>
                      </View>
                    )}
                    {configInfo.serverPublicKey && (
                      <View style={styles.configRow}>
                        <View style={styles.configLabelRow}>
                          <MaterialCommunityIcons name="key" size={16} color={COLORS.textSecondary} />
                          <Text style={styles.configLabel}>Server Key:</Text>
                        </View>
                        <Text style={styles.configValue} numberOfLines={1} ellipsizeMode="middle">
                          {configInfo.serverPublicKey.length > 24
                            ? `${configInfo.serverPublicKey.slice(0, 16)}...${configInfo.serverPublicKey.slice(-8)}`
                            : configInfo.serverPublicKey}
                        </Text>
                      </View>
                    )}
                    {configInfo.keepalive && (
                      <View style={styles.configRow}>
                        <View style={styles.configLabelRow}>
                          <MaterialCommunityIcons name="heart-pulse" size={16} color={COLORS.textSecondary} />
                          <Text style={styles.configLabel}>Keepalive:</Text>
                        </View>
                        <Text style={styles.configValue}>{configInfo.keepalive} seconds</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.configDetails}>
                    <Text style={styles.configLabel}>Đang tải thông tin config...</Text>
                  </View>
                )}

                <Text style={styles.wireguardSubtitle}>
                  Import config vào WireGuard app để kích hoạt VPN tunnel
                </Text>

                <TouchableOpacity
                  style={styles.configBox}
                  onPress={() => handleCopyConfig(wireguardConfig)}
                >
                  <Text style={styles.configText} selectable numberOfLines={8}>
                    {wireguardConfig}
                  </Text>
                  <MaterialCommunityIcons name="content-copy" size={20} color={COLORS.primary} />
                </TouchableOpacity>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.importButton, styles.autoImportButton]}
                    onPress={() => handleAutoImport(wireguardConfig)}
                  >
                    <MaterialCommunityIcons name="import" size={18} color="#fff" />
                    <Text style={styles.importButtonText}>Auto Import to WireGuard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.importButton, styles.helpButton]}
                    onPress={() => handleImportInstructions()}
                  >
                    <Text style={styles.helpButtonText}>?</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}
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
  wireguardSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    width: '100%',
  },
  wireguardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  wireguardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  wireguardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  configDetails: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  configLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  configLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  configValue: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  configBox: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  importButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  autoImportButton: {
    flex: 1,
  },
  helpButton: {
    width: 44,
    padding: 12,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
  debugSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderStyle: 'dashed',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.warning,
  },
  debugContent: {
    gap: 12,
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  debugBox: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.backgroundLight,
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: COLORS.text,
    lineHeight: 16,
  },
});

export default VpnScreen;
