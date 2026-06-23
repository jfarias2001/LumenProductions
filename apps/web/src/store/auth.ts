import { create } from 'zustand';
import { api } from '../lib/api.js';
import { connectSocket, disconnectSocket } from '../lib/socket.js';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('access_token'),

  login: async (email, password) => {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('access_token', res.accessToken);
    set({ user: res.user, accessToken: res.accessToken });
    connectSocket();
  },

  logout: async () => {
    await api.post('/auth/logout', {}).catch(() => {});
    localStorage.removeItem('access_token');
    disconnectSocket();
    set({ user: null, accessToken: null });
  },

  loadMe: async () => {
    try {
      const user = await api.get<User>('/auth/me');
      set({ user });
      connectSocket();
    } catch {
      localStorage.removeItem('access_token');
      set({ user: null, accessToken: null });
    }
  },
}));
