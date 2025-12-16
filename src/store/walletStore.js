import { create } from 'zustand';

const useWalletStore = create((set) => ({
  address: null,
  network: null,
  connected: false,
  balance: '0',
  tokenBalance: '0',
  loading: false,
  error: null,

  connectStart: () => set({ loading: true, error: null }),

  connectSuccess: (payload) =>
    set({
      address: payload.address,
      network: payload.network,
      connected: true,
      loading: false,
      error: null,
    }),

  connectFailure: (error) =>
    set({
      connected: false,
      loading: false,
      error: error,
    }),

  disconnect: () =>
    set({
      address: null,
      network: null,
      connected: false,
      balance: '0',
      tokenBalance: '0',
      error: null,
    }),

  updateBalance: (balance) => set({ balance }),

  updateTokenBalance: (tokenBalance) => set({ tokenBalance }),

  setNetwork: (network) => set({ network }),
}));

export default useWalletStore;

