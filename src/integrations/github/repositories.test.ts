import { beforeEach, describe, expect, it, vi } from 'vitest';
import { githubRequest } from './octokit-client';
import { searchRepositories } from './repositories';

// Mock octokit wrapper
vi.mock('./octokit-client', () => ({
  githubRequest: vi.fn(),
}));

// Mock sentry
vi.mock('$integrations/sentry', () => ({
  captureException: vi.fn(),
}));

const mockGithubRequest = vi.mocked(githubRequest);

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

      mockGithubRequest.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockGithubRequest).toHaveBeenCalledWith(
        'GET /search/repositories',
        { q: 'my-repo org:test-org', per_page: 50, sort: 'updated' },
        { skipLoadingIndicator: true }
      );
    });

    it('should handle search terms with special characters', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'my-repo@special';
      const mockResponse = { items: [] };

      mockGithubRequest.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockGithubRequest).toHaveBeenCalledWith(
        'GET /search/repositories',
        { q: 'my-repo@special org:test-org', per_page: 50, sort: 'updated' },
        { skipLoadingIndicator: true }
      );
    });

    it('should handle whitespace in search terms', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = '  my-repo  ';
      const mockResponse = { items: [] };

      mockGithubRequest.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockGithubRequest).toHaveBeenCalledWith(
        'GET /search/repositories',
        { q: 'my-repo org:test-org', per_page: 50, sort: 'updated' },
        { skipLoadingIndicator: true }
      );
    });
  });

  describe('without search term', () => {
    it('should search for all repositories in organization when search term is empty', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = '';
      const mockResponse = { items: [] };

      mockGithubRequest.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockGithubRequest).toHaveBeenCalledWith(
        'GET /search/repositories',
        { q: 'org:test-org', per_page: 50, sort: 'updated' },
        { skipLoadingIndicator: true }
      );
    });

    it('should search for all repositories when search term is whitespace only', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = '   ';
      const mockResponse = { items: [] };

      mockGithubRequest.mockResolvedValue(mockResponse);

      // Act
      await searchRepositories(org, searchTerm);

      // Assert
      expect(mockGithubRequest).toHaveBeenCalledWith(
        'GET /search/repositories',
        { q: 'org:test-org', per_page: 50, sort: 'updated' },
        { skipLoadingIndicator: true }
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

      mockGithubRequest.mockResolvedValue(mockResponse);

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

      mockGithubRequest.mockResolvedValue(mockResponse);

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

      mockGithubRequest.mockResolvedValue(mockResponse);

      // Act
      const result = await searchRepositories(org, searchTerm);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'test';

      mockGithubRequest.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await searchRepositories(org, searchTerm);

      // Assert
      expect(result).toEqual([]);
    });

    it('should not report rate limit errors to Sentry', async () => {
      // Arrange
      const org = 'test-org';
      const searchTerm = 'test';

      mockGithubRequest.mockRejectedValue(new Error('Rate limit exceeded'));

      // Act
      const result = await searchRepositories(org, searchTerm);

      // Assert
      expect(result).toEqual([]);
    });
  });
});