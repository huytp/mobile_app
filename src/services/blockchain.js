import { ethers } from 'ethers';

// Contract ABIs (simplified)
const REWARD_CONTRACT_ABI = [
  "function claimReward(uint256 epoch, uint256 amount, bytes32[] proof) external",
  "function claimed(uint256 epoch, address recipient) external view returns (bool)",
  "function epochRoots(uint256 epoch) external view returns (bytes32)",
  "event RewardClaimed(address indexed recipient, uint256 epoch, uint256 amount)",
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

  // Claim reward
  async claimReward(epoch, amount, proof) {
    try {
      if (!this.rewardContract) {
        throw new Error('Reward contract not initialized');
      }

      // Convert proof to bytes32[]
      const proofBytes = proof.map(p => {
        if (p.startsWith('0x')) {
          return p;
        }
        return '0x' + p;
      });

      // Check if already claimed
      const address = await this.signer.getAddress();
      const alreadyClaimed = await this.rewardContract.claimed(epoch, address);

      if (alreadyClaimed) {
        throw new Error('Reward already claimed');
      }

      // Send transaction
      const tx = await this.rewardContract.claimReward(epoch, amount, proofBytes);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
        epoch,
        amount: ethers.formatEther(amount),
      };
    } catch (error) {
      throw error;
    }
  }

  // Check if reward is claimed
  async isRewardClaimed(epoch, address) {
    try {
      if (!this.rewardContract) {
        return false;
      }
      return await this.rewardContract.claimed(epoch, address);
    } catch (error) {
      return false;
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

