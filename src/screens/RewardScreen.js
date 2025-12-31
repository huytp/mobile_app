import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useRewardStore from '../store/rewardStore';
import useWalletStore from '../store/walletStore';
import api from '../services/api';
import { COLORS } from '../utils/constants';

const RewardScreen = () => {
  const {
    epochs,
    loading,
    fetchEpochsStart,
    fetchEpochsSuccess,
    fetchEpochsFailure,
  } = useRewardStore();
  const { address, connected, tokenBalance } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (connected && address) {
      loadEpochs();
    }
  }, [connected, address]);

  const loadEpochs = async () => {
    fetchEpochsStart();
    try {
      const data = await api.getEpochs();
      fetchEpochsSuccess(data);
    } catch (err) {
      fetchEpochsFailure(err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEpochs();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }
    >
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceContent}>
          <MaterialCommunityIcons name="wallet" size={40} color={COLORS.text} />
          <View style={styles.balanceTextContainer}>
            <Text style={styles.balanceLabel}>Token Balance</Text>
            <Text style={styles.balanceValue}>{tokenBalance || '0'} DeVPN</Text>
          </View>
        </View>
      </View>

      {!connected && (
        <View style={styles.warningCard}>
          <MaterialCommunityIcons name="alert-circle" size={24} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Please connect your wallet to view rewards
          </Text>
        </View>
      )}

      {connected && (
        <>
          {/* Epochs */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Recent Epochs</Text>
            </View>
            {epochs.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No epochs found</Text>
              </View>
            ) : (
              epochs.slice(0, 10).map((epoch) => (
                <View key={epoch.epoch_id} style={styles.epochCard}>
                  <View style={styles.epochHeader}>
                    <Text style={styles.epochId}>Epoch #{epoch.epoch_id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: epoch.status === 'committed' ? COLORS.success : COLORS.warning }]}>
                      <Text style={styles.statusText}>{epoch.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.epochTime}>
                    {formatDate(epoch.end_time)}
                  </Text>
                  {epoch.merkle_root && (
                    <Text style={styles.epochRoot}>
                      Root: {epoch.merkle_root.slice(0, 16)}...
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 100,
  },
  balanceCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.9,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  warningCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    color: COLORS.warning,
    marginLeft: 12,
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  epochCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  epochHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  epochId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  epochTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  epochRoot: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    marginTop: 8,
  },
});

export default RewardScreen;
