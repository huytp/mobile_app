import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import Toast from '../components/Toast';
import { COLORS } from '../utils/constants';

const ProfileScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserInfo();
    }
  }, [isAuthenticated, user]);

  const loadUserInfo = async () => {
    try {
      const data = await api.getMe();
      setUserInfo(data.user);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.logout();
              await logout();
              api.setAuthToken(null);
              Toast.info('Logged out successfully');
              router.replace('/login');
            } catch (error) {
              // Even if API call fails, logout locally
              await logout();
              api.setAuthToken(null);
              router.replace('/login');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const displayUser = userInfo || user;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 + insets.bottom }]}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account" size={64} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.userName}>{displayUser?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{displayUser?.email || ''}</Text>
      </View>

      {/* Profile Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.primary} />
          <Text style={styles.infoTitle}>Account Information</Text>
        </View>

        <View style={styles.infoItem}>
          <View style={styles.infoItemLeft}>
            <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoLabel}>Name</Text>
          </View>
          <Text style={styles.infoValue}>{displayUser?.name || 'N/A'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <View style={styles.infoItemLeft}>
            <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoLabel}>Email</Text>
          </View>
          <Text style={styles.infoValue}>{displayUser?.email || 'N/A'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <View style={styles.infoItemLeft}>
            <MaterialCommunityIcons name="identifier" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoLabel}>User ID</Text>
          </View>
          <Text style={styles.infoValue}>#{displayUser?.id || 'N/A'}</Text>
        </View>
      </View>

      {/* Settings Card */}
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <MaterialCommunityIcons name="cog-outline" size={24} color={COLORS.primary} />
          <Text style={styles.settingsTitle}>Settings</Text>
        </View>

        <TouchableOpacity style={styles.settingItem} onPress={loadUserInfo}>
          <View style={styles.settingItemLeft}>
            <MaterialCommunityIcons name="refresh" size={20} color={COLORS.textSecondary} />
            <Text style={styles.settingLabel}>Refresh Profile</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.settingLabel}>Privacy & Security</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <MaterialCommunityIcons name="help-circle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.settingLabel}>Help & Support</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.logoutButton, loading && styles.logoutButtonDisabled]}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.text} />
        ) : (
          <>
            <MaterialCommunityIcons name="logout" size={24} color={COLORS.text} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </>
        )}
      </TouchableOpacity>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>QuadShield v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  settingsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

export default ProfileScreen;

