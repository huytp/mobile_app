import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

class NetworkSpeedService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });
  }

  // Đo tốc độ download bằng cách download một file nhỏ
  async measureDownloadSpeed(sizeInMB = 1) {
    try {
      const startTime = Date.now();

      // Download một file test từ backend (hoặc external service)
      // Sử dụng một endpoint test hoặc file nhỏ
      const response = await this.client.get('/health', {
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const dataSize = response.data.byteLength / (1024 * 1024); // MB

      if (duration === 0) return { downloadSpeed: 0, latency: 0 };

      const downloadSpeed = (dataSize / duration) * 8; // Mbps
      const latency = endTime - startTime; // ms

      return {
        downloadSpeed: Math.round(downloadSpeed * 100) / 100,
        latency: Math.round(latency),
        dataSize: Math.round(dataSize * 1000) / 1000, // MB
      };
    } catch (error) {
      return { downloadSpeed: 0, latency: 0, error: error.message };
    }
  }

  // Đo tốc độ bằng cách gọi một endpoint test với payload lớn
  async measureSpeedWithTestFile() {
    try {
      // Tạo một test file nhỏ (100KB)
      const testData = new Array(100 * 1024).fill('0').join('');

      const startTime = Date.now();
      const response = await this.client.post('/health', { test: testData }, {
        timeout: 10000,
      });
      const endTime = Date.now();

      const duration = (endTime - startTime) / 1000; // seconds
      const dataSize = testData.length / (1024 * 1024); // MB

      if (duration === 0) return { downloadSpeed: 0, uploadSpeed: 0, latency: 0 };

      const uploadSpeed = (dataSize / duration) * 8; // Mbps
      const latency = endTime - startTime; // ms

      return {
        downloadSpeed: 0, // Không đo được từ POST
        uploadSpeed: Math.round(uploadSpeed * 100) / 100,
        latency: Math.round(latency),
      };
    } catch (error) {
      return { downloadSpeed: 0, uploadSpeed: 0, latency: 0, error: error.message };
    }
  }

  // Đo tốc độ bằng cách ping server
  async measureLatency() {
    try {
      const startTime = Date.now();
      await this.client.get('/health', { timeout: 5000 });
      const endTime = Date.now();

      return {
        latency: endTime - startTime,
      };
    } catch (error) {
      return { latency: 0, error: error.message };
    }
  }

  // Đo tốc độ đơn giản bằng cách download một file test từ CDN
  async measureDownloadSpeedFromCDN() {
    try {
      // Sử dụng một CDN test file (ví dụ: speedtest.net)
      const testUrl = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';

      const startTime = Date.now();
      const response = await axios.get(testUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const endTime = Date.now();

      const duration = (endTime - startTime) / 1000; // seconds
      const dataSize = response.data.byteLength / (1024 * 1024); // MB

      if (duration === 0) return { downloadSpeed: 0, latency: 0 };

      const downloadSpeed = (dataSize / duration) * 8; // Mbps
      const latency = endTime - startTime; // ms

      return {
        downloadSpeed: Math.round(downloadSpeed * 100) / 100,
        latency: Math.round(latency),
        dataSize: Math.round(dataSize * 10000) / 10000, // MB
      };
    } catch (error) {
      return { downloadSpeed: 0, latency: 0, error: error.message };
    }
  }

  // Đo tốc độ tổng hợp (download + latency)
  async measureFullSpeed() {
    try {
      // Đo latency trước
      const latencyResult = await this.measureLatency();

      // Đo download speed từ CDN (không phụ thuộc vào backend)
      const speedResult = await this.measureDownloadSpeedFromCDN();

      return {
        downloadSpeed: speedResult.downloadSpeed,
        uploadSpeed: 0, // Khó đo upload speed mà không có server hỗ trợ
        latency: latencyResult.latency || speedResult.latency,
        ...speedResult,
      };
    } catch (error) {
      return { downloadSpeed: 0, uploadSpeed: 0, latency: 0, error: error.message };
    }
  }
}

export default new NetworkSpeedService();

