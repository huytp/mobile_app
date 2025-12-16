import { create } from 'zustand';

const useRewardStore = create((set) => ({
  epochs: [],
  pendingRewards: [],
  claimedRewards: [],
  loading: false,
  error: null,

  fetchEpochsStart: () => set({ loading: true, error: null }),

  fetchEpochsSuccess: (epochs) =>
    set({
      epochs,
      loading: false,
    }),

  fetchEpochsFailure: (error) =>
    set({
      loading: false,
      error: error,
    }),

  updatePendingRewards: (pendingRewards) => set({ pendingRewards }),

  addClaimedReward: (reward) =>
    set((state) => ({
      claimedRewards: [...state.claimedRewards, reward],
      pendingRewards: state.pendingRewards.filter((r) => r.epoch !== reward.epoch),
    })),

  claimRewardStart: () => set({ loading: true, error: null }),

  claimRewardSuccess: (reward) =>
    set((state) => ({
      loading: false,
      claimedRewards: [...state.claimedRewards, reward],
    })),

  claimRewardFailure: (error) =>
    set({
      loading: false,
      error: error,
    }),
}));

export default useRewardStore;

