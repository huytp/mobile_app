import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useWalletStore from '../store/walletStore';
import blockchain from '../services/blockchain';
import { ethers } from 'ethers';
import Button from '../components/Button';
import Card from '../components/Card';
import Toast from '../components/Toast';

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
      console.error('Error loading balances:', error);
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
      <Card>
        {connected ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{shortenAddress(address)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Network:</Text>
              <Text style={styles.value}>{network}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>ETH Balance:</Text>
              <Text style={styles.value}>{parseFloat(balance).toFixed(4)} ETH</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Token Balance:</Text>
              <Text style={styles.value}>{tokenBalance} DEVPN</Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button type="warning" onPress={handleDisconnect}>
                Disconnect
              </Button>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.welcomeText}>Connect Your Wallet</Text>
            <Text style={styles.descriptionText}>
              Connect your Web3 wallet to use DeVPN services
            </Text>
            <View style={styles.buttonContainer}>
              <Button
                type="primary"
                onPress={handleConnect}
                loading={loading}
              >
                Connect Wallet
              </Button>
            </View>
          </>
        )}
      </Card>

      {connected && (
        <Card>
          <Text style={styles.sectionTitle}>Wallet Info</Text>
          <Text style={styles.infoText}>
            Your wallet address is used to:
          </Text>
          <Text style={styles.bulletPoint}>• Connect to VPN</Text>
          <Text style={styles.bulletPoint}>• Claim rewards</Text>
          <Text style={styles.bulletPoint}>• Receive DEVPN tokens</Text>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginTop: 4,
  },
});

export default WalletScreen;

