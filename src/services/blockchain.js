import { ethers } from 'ethers';

// Contract ABIs (simplified)
const REWARD_CONTRACT_ABI = [
  "function epochRoots(uint256 epoch) external view returns (bytes32)",
];

const REPUTATION_CONTRACT_ABI = [
  "function score(address node) external view returns (uint8)",
  "function getEpochScore(address node, uint epoch) external view returns (uint8)",
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.rewardContract = null;
    this.reputationContract = null;
  }

  // Initialize with wallet provider
  async initialize(provider, rewardContractAddress, reputationContractAddress) {
    // Use Web3Provider for browser, JsonRpcProvider for other cases
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(provider);
    } else {
      this.provider = new ethers.JsonRpcProvider(provider);
    }
    this.signer = await this.provider.getSigner();

    if (rewardContractAddress) {
      this.rewardContract = new ethers.Contract(
        rewardContractAddress,
        REWARD_CONTRACT_ABI,
        this.signer
      );
    }

    if (reputationContractAddress) {
      this.reputationContract = new ethers.Contract(
        reputationContractAddress,
        REPUTATION_CONTRACT_ABI,
        this.signer
      );
    }
  }

  // Get token balance
  async getTokenBalance(tokenAddress, userAddress) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      const balance = await tokenContract.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      return '0';
    }
  }

  // Get reputation score
  async getReputationScore(nodeAddress) {
    try {
      if (!this.reputationContract) {
        return null;
      }
      const score = await this.reputationContract.score(nodeAddress);
      return score;
    } catch (error) {
      return null;
    }
  }

  // Get current account
  async getCurrentAccount() {
    try {
      if (!this.signer) {
        return null;
      }
      return await this.signer.getAddress();
    } catch (error) {
      return null;
    }
  }
}

export default new BlockchainService();

