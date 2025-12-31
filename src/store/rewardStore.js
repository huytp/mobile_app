import { create } from 'zustand';

const useRewardStore = create((set) => ({
  epochs: [],
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
}));

export default useRewardStore;

