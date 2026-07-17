import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';
import { authAPI } from '../api/endpoints';
import { getErrorMessage } from '../utils/apiErrors';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ username, password });
          const tokenResponse = response;
          // Store token so axios interceptor picks it up for subsequent requests
          localStorage.setItem('token', tokenResponse.access_token);
          localStorage.setItem('access_token', tokenResponse.access_token);

          set({
            token: tokenResponse.access_token,
            user: tokenResponse.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          const errorMessage = getErrorMessage(
            error,
            'Login failed. Please check your credentials.'
          );
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
