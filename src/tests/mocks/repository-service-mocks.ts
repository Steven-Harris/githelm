import { vi } from 'vitest';
import type { PullRequest, WorkflowRun, Job } from '$integrations/github';

// Mock pull requests data
export const mockPullRequests: Record<string, PullRequest[]> = {
  'test-org/test-repo': [
    {
      title: 'Add new feature',
      number: 123,
      createdAt: '2025-05-03T10:00:00Z',
      user: {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
      },
      html_url: 'https://github.com/test-org/test-repo/pull/123',
      isDraft: false,
      labels: [{ name: 'enhancement', color: '0366d6', description: 'New feature or enhancement' }],
      reviews: [],
    },
    {
      title: 'Fix critical bug',
      number: 124,
      createdAt: '2025-05-02T15:30:00Z',
      user: {
        login: 'anotheruser',
        avatar_url: 'https://github.com/anotheruser.png',
      },
      html_url: 'https://github.com/test-org/test-repo/pull/124',
      isDraft: false,
      labels: [{ name: 'bug', color: 'd73a4a', description: 'Bug fix' }],
      reviews: [
        {
          user: {
            login: 'reviewer1',
            avatar_url: 'https://github.com/reviewer1.png',
          },
          state: 'APPROVED',
          submitted_at: '2025-05-03T12:00:00Z',
        },
      ],
    },
  ],
};

// Mock workflow runs data
export const mockWorkflowRuns: Record<string, WorkflowRun[]> = {
  'test-org/test-repo': [
    {
      id: 1001,
      name: 'CI',
      workflow_id: 201,
      html_url: 'https://github.com/test-org/test-repo/actions/runs/1001',
      status: 'completed',
      conclusion: 'success',
      created_at: '2025-05-03T14:00:00Z',
      updated_at: '2025-05-03T14:10:00Z',
      jobs_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1001/jobs',
      run_number: 42,
      head_branch: 'main',
      path: '.github/workflows/ci.yml',
      jobs: [],
    },
    {
      id: 1002,
      name: 'Deploy',
      workflow_id: 202,
      html_url: 'https://github.com/test-org/test-repo/actions/runs/1002',
      status: 'completed',
      conclusion: 'failure',
      created_at: '2025-05-03T15:00:00Z',
      updated_at: '2025-05-03T15:15:00Z',
      jobs_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1002/jobs',
      run_number: 43,
      head_branch: 'feature',
      path: '.github/workflows/deploy.yml',
      jobs: [],
    },
  ],
};

// Mock workflow jobs
export const mockJobs: Record<number, Job[]> = {
  1001: [
    {
      id: 501,
      name: 'build',
      status: 'completed',
      conclusion: 'success',
      started_at: '2025-05-03T14:00:00Z',
      completed_at: '2025-05-03T14:08:00Z',
      steps: [
        {
          name: 'Checkout repository',
          status: 'completed',
          conclusion: 'success',
          number: 1,
        },
        {
          name: 'Install dependencies',
          status: 'completed',
          conclusion: 'success',
          number: 2,
        },
      ],
    },
  ],
  1002: [
    {
      id: 502,
      name: 'deploy',
      status: 'completed',
      conclusion: 'failure',
      started_at: '2025-05-03T15:00:00Z',
      completed_at: '2025-05-03T15:12:00Z',
      steps: [
        {
          name: 'Checkout repository',
          status: 'completed',
          conclusion: 'success',
          number: 1,
        },
        {
          name: 'Deploy to production',
          status: 'completed',
          conclusion: 'failure',
          number: 2,
        },
      ],
    },
  ],
};

// Mock configuration data
export const mockConfigs = [
  {
    org: 'test-org',
    repo: 'test-repo',
    pullRequests: ['enhancement', 'bug'],
    actions: ['ci.yml', 'deploy.yml'],
  },
  {
    org: 'another-org',
    repo: 'another-repo',
    pullRequests: ['ready-for-review'],
    actions: [],
  },
];

// Mock functions for external dependencies
export const mockFirebaseConfigService = {
  getConfigurations: vi.fn().mockResolvedValue(mockConfigs),
  saveConfigurations: vi.fn().mockResolvedValue(true),
};

export const mockGithubApi = {
  fetchMultipleRepositoriesPullRequests: vi.fn().mockResolvedValue(mockPullRequests),
  fetchActions: vi.fn().mockResolvedValue(mockWorkflowRuns['test-org/test-repo']),
  fetchMultipleWorkflowJobs: vi.fn().mockImplementation((runs) => {
    const result: Record<number, Job[]> = {};
    runs.forEach((run) => {
      result[run.id] = mockJobs[run.id] || [];
    });
    return Promise.resolve(result);
  }),
};

export const mockStorage = {
  getStorageObject: vi.fn().mockImplementation((key) => {
    if (key === 'pull-requests-cache') {
      return {
        data: mockPullRequests,
        lastUpdated: Date.now() - 30000, // 30 seconds ago
      };
    }
    if (key === 'workflow-runs-cache') {
      return {
        data: mockWorkflowRuns,
        lastUpdated: Date.now() - 30000, // 30 seconds ago
      };
    }
    return null;
  }),
  setStorageObject: vi.fn(),
};

export const mockPollingStore = {
  start: vi.fn(),
  stop: vi.fn(),
  subscribe: vi.fn(),
};

// Mock for the polling store factory function
export const mockCreatePollingStore = vi.fn().mockReturnValue(mockPollingStore);
