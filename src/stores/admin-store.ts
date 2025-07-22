import { createStore } from 'zustand';

export interface AdminStore {
  isAuthenticated: boolean;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (apiKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  clearError: () => void;
}

export const createAdminStore = () => {
  return createStore<AdminStore>((set, get) => ({
    isAuthenticated: false,
    sessionToken: null,
    isLoading: false,
    error: null,

    login: async (apiKey: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await fetch('/api/admin/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ api_key: apiKey }),
        });

        if (!response.ok) {
          throw new Error('Login failed');
        }

        const data = await response.json();
        const { session_token } = data;
        
        // Store session token in cookie
        document.cookie = `session_token=${session_token}; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 days
        
        set({ 
          isAuthenticated: true, 
          sessionToken: session_token,
          isLoading: false,
          error: null 
        });
        
        return true;
      } catch {
        set({ 
          isAuthenticated: false, 
          sessionToken: null,
          isLoading: false, 
          error: 'Login failed' 
        });
        return false;
      }
    },

    logout: async () => {
      const { sessionToken } = get();
      
      if (sessionToken) {
        try {
          await fetch('/api/admin/sessions', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
      
      // Clear session token from cookie
      document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      set({ 
        isAuthenticated: false, 
        sessionToken: null,
        isLoading: false,
        error: null 
      });
    },

    checkSession: async () => {
      const { sessionToken } = get();
      
      if (!sessionToken) {
        // Try to get session token from cookie
        const cookies = document.cookie.split(';');
        const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('session_token='));
        
        if (sessionCookie) {
          const token = sessionCookie.split('=')[1];
          set({ sessionToken: token });
        } else {
          // Only set state if it's different from current state
          const currentState = get();
          if (currentState.isAuthenticated !== false) {
            set({ isAuthenticated: false });
          }
          return false;
        }
      }

      try {
        const response = await fetch('/api/admin/sessions/validate', {
          headers: {
            'Authorization': `Bearer ${get().sessionToken}`,
          },
        });

        const isValid = response.ok;
        const currentState = get();
        
        // Only update state if it's different
        if (currentState.isAuthenticated !== isValid) {
          set({ isAuthenticated: isValid });
        }
        
        if (!isValid) {
          // Clear invalid session
          document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          if (currentState.sessionToken !== null) {
            set({ sessionToken: null });
          }
        }
        
        return isValid;
      } catch {
        const currentState = get();
        // Only update state if it's different
        if (currentState.isAuthenticated !== false || currentState.sessionToken !== null) {
          set({ isAuthenticated: false, sessionToken: null });
        }
        return false;
      }
    },

    clearError: () => set({ error: null }),
  }));
}; 