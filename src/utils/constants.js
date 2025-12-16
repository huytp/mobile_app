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

