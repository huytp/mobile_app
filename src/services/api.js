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

  // Get connection stats (traffic, speed)
  async getConnectionStats(connectionId) {
    try {
      const response = await this.client.get(`/vpn/status/${connectionId}`);
      return response.data.stats || {};
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Node Status
  async getNodeStatus(nodeAddress) {
    try {
      const response = await this.client.get(`/nodes/status/${nodeAddress}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllNodes() {
    try {
      const response = await this.client.get('/nodes/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Rewards
  async getEpoch(epochId) {
    try {
      const response = await this.client.get(`/rewards/epoch/${epochId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRewardProof(nodeAddress, epochId) {
    try {
      const response = await this.client.get('/rewards/proof', {
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
      const response = await this.client.get('/rewards/epochs');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async verifyReward(nodeAddress, epochId) {
    try {
      const response = await this.client.get(`/rewards/verify/${epochId}`, {
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
      // Server trả về response nhưng có lỗi
      const errorMessage = error.response.data?.error || error.response.data?.message || 'API Error';

      // Xử lý lỗi 503 (No available route)
      if (error.response.status === 503 && errorMessage.includes('No available route')) {
        return new Error('Không có route khả dụng. Vui lòng đảm bảo:\n1. Có nodes đã đăng ký\n2. AI Routing Engine đang chạy\n3. Nodes đang active');
      }

      return new Error(`${errorMessage} (Status: ${error.response.status})`);
    } else if (error.request) {
      // Request được gửi nhưng không nhận được response
      return new Error(`Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Backend có đang chạy không?\n2. URL: ${API_BASE_URL}\n3. Trên mobile device, dùng IP thay vì localhost`);
    } else {
      // Lỗi khi setup request
      return new Error(error.message || 'Unknown error');
    }
  }
}

export default new ApiService();

