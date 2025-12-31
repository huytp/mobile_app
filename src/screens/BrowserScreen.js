import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import api from '../services/api';
import { COLORS } from '../utils/constants';
import useVpnStore from '../store/vpnStore';

// Import expo-notifications
import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const BrowserScreen = () => {
  const insets = useSafeAreaInsets();
  const { status: vpnStatus } = useVpnStore();
  const [url, setUrl] = useState('https://www.google.com');
  const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const webViewRef = useRef(null);

  // Cache for URL safety checks and user decisions
  const urlSafetyCache = useRef(new Map()); // Map<url, {isMalicious: boolean, userAllowed: boolean}>
  const checkingUrls = useRef(new Set()); // Track URLs currently being checked
  const pendingRequests = useRef(new Map()); // Map<url, {resolve: function, request: object}>

  // Check if VPN is connected
  const isVpnConnected = vpnStatus === 'connected';

  // Request notification permissions on mount
  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Notification permissions not granted');
        }
      } catch (err) {
        console.warn('Failed to request notification permissions:', err);
      }
    })();
  }, []);

  // Normalize URL - add https:// if missing
  const normalizeUrl = (inputUrl) => {
    if (!inputUrl) return '';

    let normalized = inputUrl.trim();

    // Remove whitespace
    normalized = normalized.replace(/\s/g, '');

    // If it doesn't start with http:// or https://, add https://
    if (!normalized.match(/^https?:\/\//i)) {
      // Check if it looks like a domain (has dots)
      if (normalized.includes('.')) {
        normalized = 'https://' + normalized;
      } else {
        // Otherwise, treat as search query and use Google
        normalized = `https://www.google.com/search?q=${encodeURIComponent(normalized)}`;
      }
    }

    return normalized;
  };

  // Extract domain from URL
  const extractDomain = (urlString) => {
    try {
      const url = new URL(urlString);
      return url.hostname;
    } catch (e) {
      return null;
    }
  };

  // Check if URL is malicious (async, returns promise)
  const checkUrlSafety = async (urlToCheck) => {
    // Skip check if VPN not connected
    if (!isVpnConnected) {
      return { is_malicious: false, allow: true };
    }

    // Check cache first
    const cached = urlSafetyCache.current.get(urlToCheck);
    if (cached) {
      if (cached.isMalicious && !cached.userAllowed) {
        return { is_malicious: true, allow: false };
      }
      return { is_malicious: cached.isMalicious, allow: true };
    }

    // Skip if already checking this URL
    if (checkingUrls.current.has(urlToCheck)) {
      return { is_malicious: false, allow: false, checking: true };
    }

      checkingUrls.current.add(urlToCheck);

    try {
      const result = await api.checkURL(urlToCheck);

      // Cache the result
      urlSafetyCache.current.set(urlToCheck, {
        isMalicious: result.is_malicious,
        userAllowed: false,
        confidence: result.confidence,
        probability: result.probability,
      });

      checkingUrls.current.delete(urlToCheck);

      return {
        is_malicious: result.is_malicious,
        allow: !result.is_malicious,
        confidence: result.confidence,
        probability: result.probability,
      };
    } catch (error) {
      console.error('Error checking URL safety:', error);
      checkingUrls.current.delete(urlToCheck);
      // If check fails, allow navigation (fail open)
      return { is_malicious: false, allow: true };
    }
  };

  // Show malicious URL alert and get user decision
  const showMaliciousUrlAlert = (urlToCheck, confidence, probability) => {
    return new Promise((resolve) => {
      // Show notification
      Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Malicious URL Warning',
          body: `URL "${urlToCheck}" has been detected as malicious (Confidence: ${confidence}, Probability: ${(probability * 100).toFixed(1)}%)`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority?.HIGH || 'high',
        },
        trigger: null,
      }).catch((notifError) => {
        console.warn('Failed to show notification:', notifError);
      });

      // Show alert
      Alert.alert(
        '⚠️ Malicious URL Warning',
        `This URL has been detected as malicious:\n\n${urlToCheck}\n\nConfidence: ${confidence}\nProbability: ${(probability * 100).toFixed(1)}%\n\nDo you want to continue accessing it?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              resolve(false);
            },
          },
          {
            text: 'Continue Anyway',
            style: 'destructive',
            onPress: () => {
              // Update cache to allow this URL
              const cached = urlSafetyCache.current.get(urlToCheck);
              if (cached) {
                cached.userAllowed = true;
              }
              resolve(true);
            },
          },
        ]
      );
    });
  };

  // Handle URL navigation
  const handleGo = async () => {
    const normalizedUrl = normalizeUrl(url);
    setUrl(normalizedUrl);

    if (isVpnConnected) {
      // Check URL safety before loading
      const result = await checkUrlSafety(normalizedUrl);
      if (result.is_malicious && !result.allow) {
        // Show alert and wait for user decision
        const userAllowed = await showMaliciousUrlAlert(
          normalizedUrl,
          result.confidence,
          result.probability
        );
        if (userAllowed) {
          setCurrentUrl(normalizedUrl);
        }
      } else {
        // URL is safe or user already allowed it
        setCurrentUrl(normalizedUrl);
      }
    } else {
      // VPN not connected, load URL directly without checking
      setCurrentUrl(normalizedUrl);
    }
  };

  // Handle WebView navigation state change
  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setUrl(navState.url);
  };

  // Handle WebView load start
  const handleLoadStart = () => {
    setLoading(true);
  };

  // Handle WebView load end
  const handleLoadEnd = () => {
    setLoading(false);
  };

  // Handle back button
  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  // Handle forward button
  const handleGoForward = () => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // Calculate bottom padding to avoid tab bar
  const tabBarHeight = 70 + insets.bottom;

  return (
    <View style={styles.container}>
      {/* URL Bar */}
      <View style={[styles.urlBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.urlInputContainer}>
          <MaterialCommunityIcons
            name="web"
            size={20}
            color={COLORS.textSecondary}
            style={styles.urlIcon}
          />
          <TextInput
            style={styles.urlInput}
            value={url}
            onChangeText={setUrl}
            placeholder="Enter URL or search..."
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleGo}
            selectTextOnFocus
          />
          {loading && (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={styles.loadingIndicator}
            />
          )}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
            onPress={handleGoBack}
            disabled={!canGoBack}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={canGoBack ? COLORS.text : COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
            onPress={handleGoForward}
            disabled={!canGoForward}
          >
            <MaterialCommunityIcons
              name="arrow-right"
              size={24}
              color={canGoForward ? COLORS.text : COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={handleRefresh}>
            <MaterialCommunityIcons
              name="refresh"
              size={24}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={handleGo}>
            <MaterialCommunityIcons
              name="arrow-right-circle"
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onShouldStartLoadWithRequest={(request) => {
          // Only check if VPN is connected
          if (!isVpnConnected) {
            return true;
          }

          const requestUrl = request.url;

          // Skip checking data URLs, about:blank, etc.
          if (!requestUrl || requestUrl.startsWith('data:') || requestUrl.startsWith('about:') || requestUrl.startsWith('javascript:') || requestUrl.startsWith('file:')) {
            return true;
          }

          // Check cache first
          const cached = urlSafetyCache.current.get(requestUrl);
          if (cached) {
            if (cached.isMalicious && !cached.userAllowed) {
              // Already checked and user didn't allow, block
              return false;
            }
            // Safe or user allowed, allow request
            return true;
          }

          // If already checking, block for now
          if (checkingUrls.current.has(requestUrl)) {
            return false;
          }

          // Start checking in background
          checkUrlSafety(requestUrl).then((result) => {
            if (result.is_malicious && !result.allow) {
              // Show alert
              showMaliciousUrlAlert(
                requestUrl,
                result.confidence,
                result.probability
              ).then((userAllowed) => {
                if (userAllowed) {
                  // User allowed, update cache and navigate
                  const cached = urlSafetyCache.current.get(requestUrl);
                  if (cached) {
                    cached.userAllowed = true;
                  }
                  // Navigate to the URL
                  setCurrentUrl(requestUrl);
                } else {
                  // User cancelled, go back or stay on current page
                  if (webViewRef.current && canGoBack) {
                    webViewRef.current.goBack();
                  }
                }
              });
            } else if (!result.is_malicious) {
              // URL is safe, navigate to it
              setCurrentUrl(requestUrl);
            }
          });

          // Block initially, will navigate after check if safe
          checkingUrls.current.add(requestUrl);
          return false;
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              Loading...
            </Text>
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        contentInsetAdjustmentBehavior="automatic"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#0a0e1f',
  },
  urlBar: {
    backgroundColor: COLORS.card || 'rgba(26, 30, 53, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  urlIcon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    color: COLORS.text || '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background || '#0a0e1f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.text || '#FFFFFF',
    fontSize: 14,
  },
});

export default BrowserScreen;

