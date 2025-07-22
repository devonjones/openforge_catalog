import { createAdminStore } from '../admin-store';

// Mock fetch globally
global.fetch = jest.fn();

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

describe('AdminStore', () => {
  let store: ReturnType<typeof createAdminStore>;

  beforeEach(() => {
    store = createAdminStore();
    jest.clearAllMocks();
    document.cookie = '';
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionToken).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe('login', () => {
    it('should login successfully with valid API key', async () => {
      const mockResponse = {
        session_token: 'test-session-token',
        expires_at: '2024-12-31T23:59:59Z'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await store.getState().login('valid-api-key');

      expect(result).toBe(true);
      expect(store.getState().isAuthenticated).toBe(true);
      expect(store.getState().sessionToken).toBe('test-session-token');
      expect(store.getState().isLoading).toBe(false);
      expect(store.getState().error).toBe(null);
      expect(fetch).toHaveBeenCalledWith('/api/admin/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: 'valid-api-key' }),
      });
      expect(document.cookie).toContain('session_token=test-session-token');
    });

    it('should handle login failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const result = await store.getState().login('invalid-api-key');

      expect(result).toBe(false);
      expect(store.getState().isAuthenticated).toBe(false);
      expect(store.getState().sessionToken).toBe(null);
      expect(store.getState().isLoading).toBe(false);
      expect(store.getState().error).toBe('Login failed');
    });

    it('should handle network error during login', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await store.getState().login('valid-api-key');

      expect(result).toBe(false);
      expect(store.getState().isAuthenticated).toBe(false);
      expect(store.getState().sessionToken).toBe(null);
      expect(store.getState().isLoading).toBe(false);
      expect(store.getState().error).toBe('Login failed');
    });

    it('should set loading state during login', async () => {
      (fetch as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const loginPromise = store.getState().login('valid-api-key');
      
      expect(store.getState().isLoading).toBe(true);
      
      await loginPromise;
    });
  });

  describe('logout', () => {
    it('should logout successfully with session token', async () => {
      // Set up authenticated state
      store.setState({
        isAuthenticated: true,
        sessionToken: 'test-session-token',
        isLoading: false,
        error: null
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      await store.getState().logout();

      expect(store.getState().isAuthenticated).toBe(false);
      expect(store.getState().sessionToken).toBe(null);
      expect(store.getState().isLoading).toBe(false);
      expect(store.getState().error).toBe(null);
      expect(fetch).toHaveBeenCalledWith('/api/admin/sessions', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-session-token',
        },
      });
      expect(document.cookie).toContain('session_token=;');
    });

    it('should logout without session token', async () => {
      // Set up unauthenticated state
      store.setState({
        isAuthenticated: false,
        sessionToken: null,
        isLoading: false,
        error: null
      });

      await store.getState().logout();

      expect(store.getState().isAuthenticated).toBe(false);
      expect(store.getState().sessionToken).toBe(null);
      expect(fetch).not.toHaveBeenCalled();
      expect(document.cookie).toContain('session_token=;');
    });

    it('should handle logout error gracefully', async () => {
      // Set up authenticated state
      store.setState({
        isAuthenticated: true,
        sessionToken: 'test-session-token',
        isLoading: false,
        error: null
      });

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await store.getState().logout();

      expect(store.getState().isAuthenticated).toBe(false);
      expect(store.getState().sessionToken).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      expect(document.cookie).toContain('session_token=;');

      consoleSpy.mockRestore();
    });
  });

  describe('checkSession', () => {
    it('should validate existing session token successfully', async () => {
      // Set up authenticated state
      store.setState({
        isAuthenticated: false,
        sessionToken: 'test-session-token',
        isLoading: false,
        error: null
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const result = await store.getState().checkSession();

      expect(result).toBe(true);
      expect(store.getState().isAuthenticated).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/admin/sessions/validate', {
        headers: {
          'Authorization': 'Bearer test-session-token',
        },
      });
    });

    it('should find session token in cookie when not in state', async () => {
      document.cookie = 'session_token=cookie-session-token; path=/';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const result = await store.getState().checkSession();

      expect(result).toBe(true);
      expect(store.getState().sessionToken).toBe('cookie-session-token');
      expect(store.getState().isAuthenticated).toBe(true);
    });

    it('should handle invalid session token', async () => {
      // Set up authenticated state
      store.setState({
        isAuthenticated: true,
        sessionToken: 'invalid-session-token',
        isLoading: false,
        error: null
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      const result = await store.getState().checkSession();

      expect(result).toBe(false);
      expect(store.getState().isAuthenticated).toBe(false);
      expect(store.getState().sessionToken).toBe(null);
      expect(document.cookie).toContain('session_token=;');
    });

    it('should handle no session token in state or cookie', async () => {
      const result = await store.getState().checkSession();

      expect(result).toBe(false);
      expect(store.getState().isAuthenticated).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle network error during session check', async () => {
      // Set up authenticated state
      store.setState({
        isAuthenticated: true,
        sessionToken: 'test-session-token',
        isLoading: false,
        error: null
      });

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await store.getState().checkSession();

      expect(result).toBe(false);
      expect(store.getState().isAuthenticated).toBe(false);
      expect(store.getState().sessionToken).toBe(null);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      store.setState({ error: 'Some error' });
      
      store.getState().clearError();
      
      expect(store.getState().error).toBe(null);
    });
  });
}); 