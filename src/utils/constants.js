// Theme Colors
export const COLORS = {
  // Background
  background: '#0a1628',
  backgroundDark: '#060d1a',
  backgroundLight: '#132339',

  // Primary
  primary: '#FF8A65',
  primaryDark: '#FF6B4A',
  primaryLight: '#FFB085',

  // Secondary
  secondary: '#FF6B9D',
  secondaryDark: '#FF4D7D',
  secondaryLight: '#FF8DB7',

  // Status
  success: '#4CAF50',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',

  // Text
  text: '#FFFFFF',
  textSecondary: '#B0BEC5',
  textMuted: '#78909C',

  // UI Elements
  card: '#1a2942',
  cardLight: '#243550',
  border: '#2c3e50',

  // Gradients
  gradientStart: '#FF8A65',
  gradientEnd: '#FF6B9D',

  // Overlay
  overlay: 'rgba(10, 22, 40, 0.9)',
  overlayLight: 'rgba(10, 22, 40, 0.5)',
};

// Network configurations
export const NETWORKS = {
  1: {
    name: 'Ethereum Mainnet',
    rpc: 'https://mainnet.infura.io/v3/YOUR_KEY',
  },
  137: {
    name: 'Polygon',
    rpc: 'https://polygon-rpc.com',
  },
  80001: {
    name: 'Mumbai (Polygon Testnet)',
    rpc: 'https://rpc-mumbai.maticvigil.com',
  },
  8453: {
    name: 'Base',
    rpc: 'https://mainnet.base.org',
  },
  84531: {
    name: 'Base Goerli',
    rpc: 'https://goerli.base.org',
  },
  42161: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
  },
  421613: {
    name: 'Arbitrum Goerli',
    rpc: 'https://goerli-rollup.arbitrum.io/rpc',
  },
};

export const getNetworkName = (chainId) => {
  return NETWORKS[chainId]?.name || `Chain ${chainId}`;
};

export const shortenAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTokenAmount = (amount, decimals = 18) => {
  if (!amount) return '0';
  const value = parseFloat(amount) / Math.pow(10, decimals);
  return value.toFixed(4);
};

