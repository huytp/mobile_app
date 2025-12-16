import { create } from 'zustand';

const useVpnStore = create((set) => ({
  status: 'disconnected', // 'connected', 'disconnecting', 'disconnected'
  connectionId: null,
  entryNode: null,
  exitNode: null,
  routeScore: null,
  error: null,

  connectStart: () => set({ status: 'connecting', error: null }),

  connectSuccess: (payload) =>
    set({
      status: 'connected',
      connectionId: payload.connection_id,
      entryNode: payload.entry_node,
      exitNode: payload.exit_node,
      routeScore: payload.route_score,
      error: null,
    }),

  connectFailure: (error) =>
    set({
      status: 'disconnected',
      error: error,
    }),

  disconnectStart: () => set({ status: 'disconnecting' }),

  disconnectSuccess: () =>
    set({
      status: 'disconnected',
      connectionId: null,
      entryNode: null,
      exitNode: null,
      routeScore: null,
      error: null,
    }),

  disconnectFailure: (error) => set({ error: error }),

  updateStatus: (payload) =>
    set((state) => ({
      status: payload.status || state.status,
      entryNode: payload.entryNode || state.entryNode,
      exitNode: payload.exitNode || state.exitNode,
      routeScore: payload.routeScore || state.routeScore,
    })),
}));

export default useVpnStore;

