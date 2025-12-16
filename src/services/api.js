import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // VPN Connection
  async connectVPN(userAddress = null, preferredNodes = []) {
    try {
      const payload = {
        preferred_nodes: preferredNodes,
      };

      // Chỉ thêm user_address nếu có
      if (userAddress) {
        payload.user_address = userAddress;
      }

      const response = await this.client.post('/vpn/connect', payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async disconnectVPN(connectionId) {
    try {
      const response = await this.client.post('/vpn/disconnect', {
        connection_id: connectionId,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getConnectionStatus(connectionId) {
    try {
      const response = await this.client.get(`/vpn/status/${connectionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Node Status
  async getNodeStatus(nodeAddress) {
    try {
      const response = await this.client.get(`/node/status/${nodeAddress}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllNodes() {
    try {
      const response = await this.client.get('/node/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Rewards
  async getEpoch(epochId) {
    try {
      const response = await this.client.get(`/reward/epoch/${epochId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRewardProof(nodeAddress, epochId) {
    try {
      const response = await this.client.get('/reward/proof', {
        params: {
          node: nodeAddress,
          epoch: epochId,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEpochs() {
    try {
      const response = await this.client.get('/reward/epochs');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async verifyReward(nodeAddress, epochId) {
    try {
      const response = await this.client.get(`/reward/verify/${epochId}`, {
        params: {
          node: nodeAddress,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      return new Error(error.response.data.error || 'API Error');
    } else if (error.request) {
      return new Error('Network Error');
    } else {
      return error;
    }
  }
}

export default new ApiService();

