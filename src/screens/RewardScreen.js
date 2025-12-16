import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import useRewardStore from '../store/rewardStore';
import useWalletStore from '../store/walletStore';
import api from '../services/api';
import blockchain from '../services/blockchain';
import Button from '../components/Button';
import Card from '../components/Card';
import Toast from '../components/Toast';

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
      console.error('Error loading pending rewards:', err);
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Card>
        <Text style={styles.balanceLabel}>Token Balance</Text>
        <Text style={styles.balanceValue}>{tokenBalance || '0'} DEVPN</Text>
      </Card>

      {!connected && (
        <Card>
          <Text style={styles.warningText}>
            Please connect your wallet to view rewards
          </Text>
        </Card>
      )}

      {connected && (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Pending Rewards</Text>
            {pendingRewards.length === 0 ? (
              <Text style={styles.emptyText}>No pending rewards</Text>
            ) : (
              pendingRewards.map((reward) => (
                <View key={reward.epoch} style={styles.rewardItem}>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardEpoch}>Epoch #{reward.epoch}</Text>
                    <Text style={styles.rewardAmount}>
                      {formatAmount(reward.amount)}
                    </Text>
                    <Text style={styles.rewardTime}>
                      {formatDate(reward.endTime)}
                    </Text>
                  </View>
                  <Button
                    type="primary"
                    size="small"
                    onPress={() => handleClaimReward(reward)}
                    loading={loading}
                  >
                    Claim
                  </Button>
                </View>
              ))
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Epochs</Text>
            {epochs.length === 0 ? (
              <Text style={styles.emptyText}>No epochs found</Text>
            ) : (
              epochs.slice(0, 10).map((epoch) => (
                <View key={epoch.epoch_id} style={styles.epochItem}>
                  <Text style={styles.epochId}>Epoch #{epoch.epoch_id}</Text>
                  <Text style={styles.epochStatus}>Status: {epoch.status}</Text>
                  <Text style={styles.epochTime}>
                    {formatDate(epoch.end_time)}
                  </Text>
                  {epoch.merkle_root && (
                    <Text style={styles.epochRoot}>
                      Root: {epoch.merkle_root.slice(0, 10)}...
                    </Text>
                  )}
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1890ff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardEpoch: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rewardAmount: {
    fontSize: 18,
    color: '#52c41a',
    marginTop: 4,
  },
  rewardTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  epochItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  epochId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  epochStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  epochTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  epochRoot: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  warningText: {
    color: '#faad14',
    textAlign: 'center',
  },
});

export default RewardScreen;

