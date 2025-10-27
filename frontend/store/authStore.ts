import { create } from 'zustand';
import { User, getUser, setUser as saveUser, setAuthToken, clearAuth } from '@/lib/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  setUser: (user, token) => {
    saveUser(user);
    setAuthToken(token);
    set({ user, isAuthenticated: true });
  },
  
  logout: () => {
    clearAuth();
    set({ user: null, isAuthenticated: false });
  },
  
  initAuth: () => {
    const user = getUser();
    set({ user, isAuthenticated: user !== null });
  },
}));

