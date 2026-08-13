import { searchRepositories } from '$integrations/github';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repositorySearchService } from './repository-search.service';

// Mock the GitHub integration
vi.mock('$integrations/github', () => ({
  searchRepositories: vi.fn(),
}));

// Mock sentry
vi.mock('$integrations/sentry', () => ({
  captureException: vi.fn(),
}));

const mockSearchRepositories = vi.mocked(searchRepositories);

describe('RepositorySearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('performSearch', () => {
    it('should search with empty search term when orgName is provided', async () => {
      // Arrange
      const orgName = 'test-org';
      const repoName = '';
      const existingRepos: ExistingRepo[] = [];
      const mockResults = [
        { name: 'repo1', full_name: 'test-org/repo1', description: 'Test repo 1', archived: false },
        { name: 'repo2', full_name: 'test-org/repo2', description: 'Test repo 2', archived: false },
      ];

      mockSearchRepositories.mockResolvedValue(mockResults);

      const stateUpdates: any[] = [];
      const onStateUpdate = (updates: any) => {
        stateUpdates.push(updates);
      };

      // Act
      await repositorySearchService.performSearch(orgName, repoName, existingRepos, onStateUpdate);

      // Assert
      expect(mockSearchRepositories).toHaveBeenCalledWith('test-org', '');
      expect(stateUpdates).toEqual([
        { isLoading: true, showResults: true },
        {
          searchResults: [
            { name: 'repo1', full_name: 'test-org/repo1', description: 'Test repo 1', archived: false, alreadyConfigured: false },
            { name: 'repo2', full_name: 'test-org/repo2', description: 'Test repo 2', archived: false, alreadyConfigured: false },
          ],
          isLoading: false
        },
      ]);
    });

    it('should search with search term when provided', async () => {
      // Arrange
      const orgName = 'test-org';
      const repoName = 'my-repo';
      const existingRepos: ExistingRepo[] = [];
      const mockResults = [
        { name: 'my-repo-1', full_name: 'test-org/my-repo-1', description: 'My repo 1', archived: false },
      ];

      mockSearchRepositories.mockResolvedValue(mockResults);

      const stateUpdates: any[] = [];
      const onStateUpdate = (updates: any) => {
        stateUpdates.push(updates);
      };

      // Act
      await repositorySearchService.performSearch(orgName, repoName, existingRepos, onStateUpdate);

      // Assert
      expect(mockSearchRepositories).toHaveBeenCalledWith('test-org', 'my-repo');
      expect(stateUpdates[1].searchResults).toEqual([
        { name: 'my-repo-1', full_name: 'test-org/my-repo-1', description: 'My repo 1', archived: false, alreadyConfigured: false },
      ]);
    });

    it('should trim whitespace from search term', async () => {
      // Arrange
      const orgName = 'test-org';
      const repoName = '  my-repo  ';
      const existingRepos: ExistingRepo[] = [];
      const mockResults: Awaited<ReturnType<typeof searchRepositories>> = [];

      mockSearchRepositories.mockResolvedValue(mockResults);

      const onStateUpdate = vi.fn();

      // Act
      await repositorySearchService.performSearch(orgName, repoName, existingRepos, onStateUpdate);

      // Assert
      expect(mockSearchRepositories).toHaveBeenCalledWith('test-org', 'my-repo');
    });

    it('should mark repositories as already configured', async () => {
      // Arrange
      const orgName = 'test-org';
      const repoName = 'repo';
      const existingRepos = [
        { org: 'test-org', repo: 'repo1' },
      ];
      const mockResults = [
        { name: 'repo1', full_name: 'test-org/repo1', description: 'Test repo 1', archived: false },
        { name: 'repo2', full_name: 'test-org/repo2', description: 'Test repo 2', archived: false },
      ];

      mockSearchRepositories.mockResolvedValue(mockResults);

      let finalStateUpdate: any;
      const onStateUpdate = (updates: any) => {
        if (updates.searchResults) {
          finalStateUpdate = updates;
        }
      };

      // Act
      await repositorySearchService.performSearch(orgName, repoName, existingRepos, onStateUpdate);

      // Assert
      expect(finalStateUpdate.searchResults).toEqual([
        { name: 'repo1', full_name: 'test-org/repo1', description: 'Test repo 1', archived: false, alreadyConfigured: true },
        { name: 'repo2', full_name: 'test-org/repo2', description: 'Test repo 2', archived: false, alreadyConfigured: false },
      ]);
    });

    it('should not search when orgName is empty', async () => {
      // Arrange
      const orgName = '';
      const repoName = 'repo';
      const existingRepos: ExistingRepo[] = [];

      const stateUpdates: any[] = [];
      const onStateUpdate = (updates: any) => {
        stateUpdates.push(updates);
      };

      // Act
      await repositorySearchService.performSearch(orgName, repoName, existingRepos, onStateUpdate);

      // Assert
      expect(mockSearchRepositories).not.toHaveBeenCalled();
      expect(stateUpdates).toEqual([
        { searchResults: [], showResults: false },
      ]);
    });

    it('should handle search errors gracefully', async () => {
      // Arrange
      const orgName = 'test-org';
      const repoName = 'repo';
      const existingRepos: ExistingRepo[] = [];

      mockSearchRepositories.mockRejectedValue(new Error('API Error'));

      const stateUpdates: any[] = [];
      const onStateUpdate = (updates: any) => {
        stateUpdates.push(updates);
      };

      // Act
      await repositorySearchService.performSearch(orgName, repoName, existingRepos, onStateUpdate);

      // Assert
      expect(stateUpdates).toEqual([
        { isLoading: true, showResults: true },
        { searchResults: [], isLoading: false },
      ]);
    });
  });
});