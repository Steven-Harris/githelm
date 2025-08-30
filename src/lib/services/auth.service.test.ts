import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth.service';
import { firebase, authState } from '$integrations/firebase';
import { repositoryFacade } from '$lib/stores/facades/repository.facade';
import { clearSiteData } from '$integrations/storage';
import { clearUserInfo } from '$integrations/sentry';

// Mock dependencies
vi.mock('$integrations/firebase', () => ({
  firebase: {
    user: { subscribe: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshGithubToken: vi.fn(),
  },
  authState: { subscribe: vi.fn() },
}));

vi.mock('$lib/stores/facades/repository.facade', () => ({
  repositoryFacade: {
    clearAllStores: vi.fn(),
  },
}));

vi.mock('$integrations/storage', () => ({
  clearSiteData: vi.fn(),
}));

vi.mock('$integrations/sentry', () => ({
  clearUserInfo: vi.fn(),
}));

vi.mock('svelte/store', () => ({
  get: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = AuthService.getInstance();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from firebase store', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' };
      const { get } = await import('svelte/store');
      vi.mocked(get).mockReturnValue(mockUser);

      const result = authService.getCurrentUser();
      expect(result).toBe(mockUser);
      expect(get).toHaveBeenCalledWith(firebase.user);
    });
  });

  describe('getAuthState', () => {
    it('should return current auth state', async () => {
      const mockState = 'authenticated';
      const { get } = await import('svelte/store');
      vi.mocked(get).mockReturnValue(mockState);

      const result = authService.getAuthState();
      expect(result).toBe(mockState);
      expect(get).toHaveBeenCalledWith(authState);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', async () => {
      const mockUser = { uid: '123' };
      const mockState = 'authenticated';
      const { get } = await import('svelte/store');
      vi.mocked(get)
        .mockReturnValueOnce(mockUser)
        .mockReturnValueOnce(mockState);

      const result = authService.isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false when user is not authenticated', async () => {
      const mockUser = null;
      const mockState = 'unauthenticated';
      const { get } = await import('svelte/store');
      vi.mocked(get)
        .mockReturnValueOnce(mockUser)
        .mockReturnValueOnce(mockState);

      const result = authService.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('signIn', () => {
    it('should call firebase signIn successfully', async () => {
      vi.mocked(firebase.signIn).mockResolvedValue(undefined);

      await authService.signIn();

      expect(firebase.signIn).toHaveBeenCalled();
    });

    it('should handle signIn errors', async () => {
      const error = new Error('Sign in failed');
      vi.mocked(firebase.signIn).mockRejectedValue(error);

      await expect(authService.signIn()).rejects.toThrow('Sign in failed');
    });
  });

  describe('signOut', () => {
    it('should clear all data and sign out successfully', async () => {
      vi.mocked(firebase.signOut).mockResolvedValue(undefined);
      vi.mocked(repositoryFacade.clearAllStores).mockReturnValue(undefined);
      vi.mocked(clearSiteData).mockReturnValue(undefined);
      vi.mocked(clearUserInfo).mockReturnValue(undefined);

      await authService.signOut();

      expect(repositoryFacade.clearAllStores).toHaveBeenCalled();
      expect(clearSiteData).toHaveBeenCalled();
      expect(clearUserInfo).toHaveBeenCalled();
      expect(firebase.signOut).toHaveBeenCalled();
    });

    it('should handle signOut errors', async () => {
      const error = new Error('Sign out failed');
      vi.mocked(firebase.signOut).mockRejectedValue(error);

      await expect(authService.signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('refreshToken', () => {
    it('should call firebase refreshGithubToken successfully', async () => {
      vi.mocked(firebase.refreshGithubToken).mockResolvedValue(undefined);

      await authService.refreshToken();

      expect(firebase.refreshGithubToken).toHaveBeenCalled();
    });

    it('should handle refreshToken errors', async () => {
      const error = new Error('Token refresh failed');
      vi.mocked(firebase.refreshGithubToken).mockRejectedValue(error);

      await expect(authService.refreshToken()).rejects.toThrow('Token refresh failed');
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile when user exists', async () => {
      const mockUser = {
        uid: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };
      const { get } = await import('svelte/store');
      vi.mocked(get).mockReturnValue(mockUser);

      const result = authService.getUserProfile();

      expect(result).toEqual({
        uid: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      });
    });

    it('should return null when no user exists', async () => {
      const { get } = await import('svelte/store');
      vi.mocked(get).mockReturnValue(null);

      const result = authService.getUserProfile();

      expect(result).toBeNull();
    });
  });

  describe('subscribeToAuthState', () => {
    it('should return unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(authState.subscribe).mockReturnValue(mockUnsubscribe);

      const result = authService.subscribeToAuthState(vi.fn());

      expect(result).toBe(mockUnsubscribe);
      expect(authState.subscribe).toHaveBeenCalled();
    });
  });

  describe('subscribeToUser', () => {
    it('should return unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(firebase.user.subscribe).mockReturnValue(mockUnsubscribe);

      const result = authService.subscribeToUser(vi.fn());

      expect(result).toBe(mockUnsubscribe);
      expect(firebase.user.subscribe).toHaveBeenCalled();
    });
  });
});
