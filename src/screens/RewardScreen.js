import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useRewardStore from '../store/rewardStore';
import useWalletStore from '../store/walletStore';
import api from '../services/api';
import blockchain from '../services/blockchain';
import Toast from '../components/Toast';
import { COLORS } from '../utils/constants';

const RewardScreen = () => {
  const {
    epochs,
    pendingRewards,
    claimedRewards,
    loading,
    fetchEpochsStart,
    fetchEpochsSuccess,
    fetchEpochsFailure,
    claimRewardStart,
    claimRewardSuccess,
    claimRewardFailure,
    updatePendingRewards,
  } = useRewardStore();
  const { address, connected, tokenBalance } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (connected && address) {
      loadEpochs();
      loadPendingRewards();
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

  const loadPendingRewards = async () => {
    if (!address) return;

    try {
      const epochsData = await api.getEpochs();
      const committedEpochs = epochsData.filter((e) => e.status === 'committed');
      const pending = [];

      for (const epoch of committedEpochs) {
        try {
          const proof = await api.getRewardProof(address, epoch.epoch_id);
          if (proof) {
            const isClaimed = await blockchain.isRewardClaimed(
              epoch.epoch_id,
              address
            );
            if (!isClaimed) {
              pending.push({
                epoch: epoch.epoch_id,
                amount: proof.amount,
                startTime: epoch.start_time,
                endTime: epoch.end_time,
                proof: proof,
              });
            }
          }
        } catch (err) {
          // Skip if no reward for this epoch
        }
      }

      updatePendingRewards(pending);
    } catch (err) {
      // Error loading pending rewards
    }
  };

  const handleClaimReward = async (reward) => {
    if (!connected || !address) {
      Toast.fail('Please connect wallet first');
      return;
    }

    claimRewardStart();
    try {
      const result = await blockchain.claimReward(
        reward.epoch,
        reward.proof.amount,
        reward.proof.proof
      );

      claimRewardSuccess({
        epoch: reward.epoch,
        amount: reward.amount,
        txHash: result.txHash,
      });

      Toast.success(`Reward claimed! TX: ${result.txHash.slice(0, 10)}...`);

      // Reload pending rewards
      loadPendingRewards();
    } catch (err) {
      claimRewardFailure(err.message);
      Toast.fail(err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadEpochs(), loadPendingRewards()]);
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatAmount = (amount) => {
    if (!amount) return '0 DEVPN';
    // Amount is in wei (smallest unit), convert to tokens
    const tokens = parseInt(amount) / 1e18;
    return tokens.toFixed(4) + ' DEVPN';
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
          {/* Pending Rewards */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="gift" size={24} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Pending Rewards</Text>
            </View>
            {pendingRewards.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="gift-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No pending rewards</Text>
              </View>
            ) : (
              pendingRewards.map((reward) => (
                <View key={reward.epoch} style={styles.rewardCard}>
                  <View style={styles.rewardInfo}>
                    <View style={styles.rewardHeader}>
                      <Text style={styles.rewardEpoch}>Epoch #{reward.epoch}</Text>
                      <Text style={styles.rewardAmount}>
                        {formatAmount(reward.amount)}
                      </Text>
                    </View>
                    <Text style={styles.rewardTime}>
                      {formatDate(reward.endTime)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => handleClaimReward(reward)}
                    disabled={loading}
                  >
                    <View style={styles.claimButtonGradient}>
                      <Text style={styles.claimButtonText}>
                        {loading ? 'Claiming...' : 'Claim'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

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
  rewardCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardHeader: {
    marginBottom: 8,
  },
  rewardEpoch: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  rewardAmount: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  rewardTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  claimButton: {
    marginLeft: 12,
  },
  claimButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  claimButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
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
