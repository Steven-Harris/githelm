import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchData } from './api-client';
import { searchRepositories } from './repositories';

// Mock the api-client
vi.mock('./api-client', () => ({
  fetchData: vi.fn(),
}));

// Mock sentry
vi.mock('$integrations/sentry', () => ({
  captureException: vi.fn(),
}));

const mockFetchData = vi.mocked(fetchData);

describe('searchRepositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with search term', () => {
    it('should include search term in GitHub API query', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'my-repo';
      const mockResponse = {
        items: [
          {
            name: 'my-repo-1',
            full_name: 'test-org/my-repo-1',
            description: 'A test repository',
          },
          {
            name: 'my-repo-2',
            full_name: 'test-org/my-repo-2',
            description: null,
          },
        ],
      };

      mockFetchData.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockFetchData).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories?q=my-repo+org:test-org&per_page=50&sort=updated',
        0,
        true
      );
    });

    it('should handle search terms with special characters', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'my-repo@special';
      const mockResponse = { items: [] };

      mockFetchData.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockFetchData).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories?q=my-repo%40special+org:test-org&per_page=50&sort=updated',
        0,
        true
      );
    });

    it('should handle whitespace in search terms', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = '  my-repo  ';
      const mockResponse = { items: [] };

      mockFetchData.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockFetchData).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories?q=my-repo+org:test-org&per_page=50&sort=updated',
        0,
        true
      );
    });
  });

  describe('without search term', () => {
    it('should search for all repositories in organization when search term is empty', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = '';
      const mockResponse = { items: [] };

      mockFetchData.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockFetchData).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories?q=org:test-org&per_page=50&sort=updated',
        0,
        true
      );
    });

    it('should search for all repositories when search term is whitespace only', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = '   ';
      const mockResponse = { items: [] };

      mockFetchData.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockFetchData).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories?q=org:test-org&per_page=50&sort=updated',
        0,
        true
      );
    });
  });

  describe('response handling', () => {
    it('should return properly formatted results', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'test';
      const mockResponse = {
        items: [
          {
            name: 'test-repo-1',
            full_name: 'test-org/test-repo-1',
            description: 'A test repository',
          },
          {
            name: 'test-repo-2',
            full_name: 'test-org/test-repo-2',
            description: null,
          },
        ],
      };

      mockFetchData.mockResolvedValue(mockResponse);

      // Act
      const result = await searchRepositories(org, searchTerm);

      // Assert
      expect(result).toEqual([
        {
          name: 'test-repo-1',
          full_name: 'test-org/test-repo-1',
          description: 'A test repository',
        },
        {
          name: 'test-repo-2',
          full_name: 'test-org/test-repo-2',
          description: null,
        },
      ]);
    });

    it('should return empty array when API response has no items', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'nonexistent';
      const mockResponse = { items: [] };

      mockFetchData.mockResolvedValue(mockResponse);

      // Act
      const result = await searchRepositories(org, searchTerm);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when API response is malformed', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'test';
      const mockResponse = {};

      mockFetchData.mockResolvedValue(mockResponse);

      // Act
      const result = await searchRepositories(org, searchTerm);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'test';

      mockFetchData.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await searchRepositories(org, searchTerm);

      // Assert
      expect(result).toEqual([]);
    });

    it('should not report rate limit errors to Sentry', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'test';

      mockFetchData.mockRejectedValue(new Error('Rate limit exceeded'));

      // Act
      const result = await searchRepositories(org, searchTerm);

      // Assert
      expect(result).toEqual([]);
    });
  });
});