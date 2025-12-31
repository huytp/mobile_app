import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const AI_ROUTING_URL = process.env.EXPO_PUBLIC_AI_ROUTING_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        // Token will be set via setAuthToken method
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // Set authentication token
  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  // Auth endpoints
  async register(email, password, name) {
    try {
      const response = await this.client.post('/auth/register', {
        user: {
          email,
          password,
          name,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async login(email, password) {
    try {
      const response = await this.client.post('/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMe() {
    try {
      const response = await this.client.get('/auth/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      const response = await this.client.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Subscription endpoints
  async getSubscriptionStatus() {
    try {
      const response = await this.client.get('/subscriptions/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSubscriptionPlans() {
    try {
      const response = await this.client.get('/subscriptions/plans');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async purchaseSubscription(plan, paymentMethod = 'google_pay') {
    try {
      const response = await this.client.post('/subscriptions/purchase', {
        plan,
        payment_method: paymentMethod,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
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

  // URL Safety Check (AI Routing)
  async checkURL(url) {
    try {
      const response = await axios.post(
        `${AI_ROUTING_URL}/url/check`,
        { url },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      // If AI routing service is not available, return safe default
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || !error.response) {
        console.warn('AI Routing service not available, assuming URL is safe');
        return {
          url,
          is_malicious: false,
          probability: 0,
          confidence: 'unknown',
        };
      }
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      // Server trả về response nhưng có lỗi
      const errorMessage = error.response.data?.error || error.response.data?.message || 'API Error';

      // Handle 503 error (No available route)
      if (error.response.status === 503 && errorMessage.includes('No available route')) {
        return new Error('No available route. Please ensure:\n1. Nodes are registered\n2. AI Routing Engine is running\n3. Nodes are active');
      }

      return new Error(`${errorMessage} (Status: ${error.response.status})`);
    } else if (error.request) {
      // Request was sent but no response received
      return new Error(`Cannot connect to server. Please check:\n1. Is the backend running?\n2. URL: ${API_BASE_URL}\n3. On mobile device, use IP instead of localhost`);
    } else {
      // Lỗi khi setup request
      return new Error(error.message || 'Unknown error');
    }
  }
}

export default new ApiService();

