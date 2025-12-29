import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useWalletStore from '../store/walletStore';
import blockchain from '../services/blockchain';
import { ethers } from 'ethers';
import Toast from '../components/Toast';
import { COLORS } from '../utils/constants';

const WalletScreen = () => {
  const {
    address,
    network,
    connected,
    balance,
    tokenBalance,
    loading,
    connectStart,
    connectSuccess,
    connectFailure,
    disconnect,
    updateBalance,
    updateTokenBalance,
  } = useWalletStore();

  useEffect(() => {
    if (connected && address) {
      loadBalances();
    }
  }, [connected, address]);

  const loadBalances = async () => {
    try {
      // Load ETH balance
      if (blockchain.provider) {
        const ethBalance = await blockchain.provider.getBalance(address);
        updateBalance(ethers.formatEther(ethBalance));
      }

      // Load token balance
      const tokenAddress = process.env.EXPO_PUBLIC_TOKEN_ADDRESS;
      if (tokenAddress) {
        const tokenBal = await blockchain.getTokenBalance(tokenAddress, address);
        updateTokenBalance(tokenBal);
      }
    } catch (error) {
      // Error loading balances
    }
  };

  const handleConnect = async () => {
    connectStart();

    try {
      // Check if wallet is available
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = window.ethereum;

        // Request account access
        const accounts = await provider.request({
          method: 'eth_requestAccounts',
        });

        if (accounts.length === 0) {
          throw new Error('No accounts found');
        }

        const account = accounts[0];

        // Get network
        const chainId = await provider.request({ method: 'eth_chainId' });
        const networkName = getNetworkName(parseInt(chainId, 16));

        // Initialize blockchain service
        const rewardContract = process.env.EXPO_PUBLIC_REWARD_CONTRACT_ADDRESS;
        const reputationContract = process.env.EXPO_PUBLIC_REPUTATION_CONTRACT_ADDRESS;

        await blockchain.initialize(provider, rewardContract, reputationContract);

        connectSuccess({
          address: account,
          network: networkName,
        });

        Toast.success('Wallet connected');
      } else {
        throw new Error('MetaMask or Web3 wallet not found');
      }
    } catch (error) {
      connectFailure(error.message);
      Toast.fail(error.message);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    Toast.info('Wallet disconnected');
  };

  const getNetworkName = (chainId) => {
    const networks = {
      1: 'Ethereum Mainnet',
      137: 'Polygon',
      80001: 'Mumbai (Polygon Testnet)',
      8453: 'Base',
      84531: 'Base Goerli',
      42161: 'Arbitrum',
      421613: 'Arbitrum Goerli',
    };
    return networks[chainId] || `Chain ${chainId}`;
  };

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <View style={styles.container}>
      {connected ? (
        <>
          {/* Connected Wallet Card */}
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.connectedCard}
          >
            <View style={styles.connectedHeader}>
              <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.text} />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
            <Text style={styles.addressText}>{shortenAddress(address)}</Text>
            <Text style={styles.networkText}>{network}</Text>
          </LinearGradient>

          {/* Balance Cards */}
          <View style={styles.balanceContainer}>
            <View style={styles.balanceCard}>
              <View style={styles.balanceIconContainer}>
                <MaterialCommunityIcons name="ethereum" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.balanceLabel}>ETH Balance</Text>
              <Text style={styles.balanceValue}>{parseFloat(balance).toFixed(4)}</Text>
            </View>

            <View style={styles.balanceCard}>
              <View style={styles.balanceIconContainer}>
                <MaterialCommunityIcons name="coin" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.balanceLabel}>DeVPN Balance</Text>
              <Text style={styles.balanceValue}>{tokenBalance || '0'}</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Wallet Info</Text>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>Connect to VPN</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="gift" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>Claim rewards</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="wallet" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>Receive DeVPN tokens</Text>
            </View>
          </View>

          {/* Disconnect Button */}
          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Not Connected State */}
          <View style={styles.notConnectedContainer}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="wallet-outline" size={80} color={COLORS.primary} />
            </View>
            <Text style={styles.welcomeText}>Connect Your Wallet</Text>
            <Text style={styles.descriptionText}>
              Connect your Web3 wallet to use DeVPN services and claim rewards
            </Text>

            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleConnect}
              disabled={loading}
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.connectButtonGradient}
              >
                <MaterialCommunityIcons name="wallet-plus" size={24} color={COLORS.text} />
                <Text style={styles.connectButtonText}>
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="security" size={32} color={COLORS.primary} />
                <Text style={styles.featureText}>Secure</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="lightning-bolt" size={32} color={COLORS.primary} />
                <Text style={styles.featureText}>Fast</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="shield-check" size={32} color={COLORS.primary} />
                <Text style={styles.featureText}>Private</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    paddingBottom: 100,
  },
  // Connected State
  connectedCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  addressText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  networkText: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.8,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  balanceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
  disconnectButton: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  disconnectButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  // Not Connected State
  notConnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  connectButton: {
    width: '100%',
    marginBottom: 40,
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  connectButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  featureItem: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});

export default WalletScreen;
