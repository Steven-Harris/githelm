import { vi } from 'vitest';
import type { PullRequest, WorkflowRun, Job } from '$integrations/github';

// Mock pull requests data
export const mockPullRequests: Record<string, PullRequest[]> = {
  'test-org/test-repo': [
    {
      url: 'https://api.github.com/repos/test-org/test-repo/pulls/123',
      events_url: 'https://api.github.com/repos/test-org/test-repo/issues/123/events',
      html_url: 'https://github.com/test-org/test-repo/pull/123',
      id: 123,
      number: 123,
      title: 'Add new feature',
      user: {
        login: 'testuser',
        id: 12345,
        avatar_url: 'https://github.com/testuser.png',
        gravatar_id: '',
        url: 'https://api.github.com/users/testuser',
        html_url: 'https://github.com/testuser',
        gists_url: 'https://api.github.com/users/testuser/gists{/gist_id}',
        type: 'User',
        user_view_type: 'public',
      },
      labels: [{ name: 'enhancement', color: '0366d6', description: 'New feature or enhancement' }],
      state: 'open',
      comments: 0,
      draft: false,
      body: 'This adds a new feature to the application',
      reactions: {
        url: 'https://api.github.com/repos/test-org/test-repo/issues/123/reactions',
        total_count: 0,
        '+1': 0,
        '-1': 0,
        laugh: 0,
        hooray: 0,
        confused: 0,
        heart: 0,
        rocket: 0,
        eyes: 0,
      },
      state_reason: null,
      reviews: [],
    },
    {
      url: 'https://api.github.com/repos/test-org/test-repo/pulls/124',
      events_url: 'https://api.github.com/repos/test-org/test-repo/issues/124/events',
      html_url: 'https://github.com/test-org/test-repo/pull/124',
      id: 124,
      number: 124,
      title: 'Fix critical bug',
      user: {
        login: 'anotheruser',
        id: 67890,
        avatar_url: 'https://github.com/anotheruser.png',
        gravatar_id: '',
        url: 'https://api.github.com/users/anotheruser',
        html_url: 'https://github.com/anotheruser',
        gists_url: 'https://api.github.com/users/anotheruser/gists{/gist_id}',
        type: 'User',
        user_view_type: 'public',
      },
      labels: [{ name: 'bug', color: 'd73a4a', description: 'Bug fix' }],
      state: 'open',
      comments: 1,
      draft: false,
      body: 'This fixes a critical bug in the application',
      reactions: {
        url: 'https://api.github.com/repos/test-org/test-repo/issues/124/reactions',
        total_count: 0,
        '+1': 0,
        '-1': 0,
        laugh: 0,
        hooray: 0,
        confused: 0,
        heart: 0,
        rocket: 0,
        eyes: 0,
      },
      state_reason: null,
      reviews: [
        {
          id: 1001,
          node_id: 'MDExOlB1bGxSZXF1ZXN0UmV2aWV3MTAwMQ==',
          user: {
            login: 'reviewer1',
            id: 98765,
            avatar_url: 'https://github.com/reviewer1.png',
            gravatar_id: '',
            url: 'https://api.github.com/users/reviewer1',
            html_url: 'https://github.com/reviewer1',
            gists_url: 'https://api.github.com/users/reviewer1/gists{/gist_id}',
            type: 'User',
            user_view_type: 'public',
          },
          body: 'Looks good to me!',
          state: 'APPROVED',
          html_url: 'https://github.com/test-org/test-repo/pull/124#pullrequestreview-1001',
          pull_request_url: 'https://api.github.com/repos/test-org/test-repo/pulls/124',
          author_association: 'COLLABORATOR',
          _links: {
            html: {
              href: 'https://github.com/test-org/test-repo/pull/124#pullrequestreview-1001',
            },
            pull_request: {
              href: 'https://api.github.com/repos/test-org/test-repo/pulls/124',
            },
          },
          submitted_at: '2025-05-03T12:00:00Z',
          commit_id: 'abc123def456',
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
      path: '.github/workflows/ci.yml',
      display_title: 'CI Build',
      run_number: 42,
      event: 'push',
      status: 'completed',
      conclusion: 'success',
      workflow_id: 201,
      url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1001',
      html_url: 'https://github.com/test-org/test-repo/actions/runs/1001',
      pull_requests: [],
      created_at: '2025-05-03T14:00:00Z',
      updated_at: '2025-05-03T14:10:00Z',
      actor: {
        login: 'testuser',
        id: 12345,
        avatar_url: 'https://github.com/testuser.png',
        gravatar_id: '',
        url: 'https://api.github.com/users/testuser',
        html_url: 'https://github.com/testuser',
        gists_url: 'https://api.github.com/users/testuser/gists{/gist_id}',
        type: 'User',
        user_view_type: 'public',
      },
      run_attempt: 1,
      referenced_workflows: [],
      run_started_at: '2025-05-03T14:00:00Z',
      triggering_actor: {
        login: 'testuser',
        id: 12345,
        avatar_url: 'https://github.com/testuser.png',
        gravatar_id: '',
        url: 'https://api.github.com/users/testuser',
        html_url: 'https://github.com/testuser',
        gists_url: 'https://api.github.com/users/testuser/gists{/gist_id}',
        type: 'User',
        user_view_type: 'public',
      },
      jobs_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1001/jobs',
      logs_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1001/logs',
      check_suite_url: 'https://api.github.com/repos/test-org/test-repo/check-suites/1001',
      artifacts_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1001/artifacts',
      cancel_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1001/cancel',
      rerun_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1001/rerun',
      previous_attempt_url: null,
      workflow_url: 'https://api.github.com/repos/test-org/test-repo/actions/workflows/201',
    },
    {
      id: 1002,
      name: 'Deploy',
      path: '.github/workflows/deploy.yml',
      display_title: 'Deploy to Production',
      run_number: 43,
      event: 'push',
      status: 'completed',
      conclusion: 'failure',
      workflow_id: 202,
      url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1002',
      html_url: 'https://github.com/test-org/test-repo/actions/runs/1002',
      pull_requests: [],
      created_at: '2025-05-03T15:00:00Z',
      updated_at: '2025-05-03T15:15:00Z',
      actor: {
        login: 'testuser',
        id: 12345,
        avatar_url: 'https://github.com/testuser.png',
        gravatar_id: '',
        url: 'https://api.github.com/users/testuser',
        html_url: 'https://github.com/testuser',
        gists_url: 'https://api.github.com/users/testuser/gists{/gist_id}',
        type: 'User',
        user_view_type: 'public',
      },
      run_attempt: 1,
      referenced_workflows: [],
      run_started_at: '2025-05-03T15:00:00Z',
      triggering_actor: {
        login: 'testuser',
        id: 12345,
        avatar_url: 'https://github.com/testuser.png',
        gravatar_id: '',
        url: 'https://api.github.com/users/testuser',
        html_url: 'https://github.com/testuser',
        gists_url: 'https://api.github.com/users/testuser/gists{/gist_id}',
        type: 'User',
        user_view_type: 'public',
      },
      jobs_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1002/jobs',
      logs_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1002/logs',
      check_suite_url: 'https://api.github.com/repos/test-org/test-repo/check-suites/1002',
      artifacts_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1002/artifacts',
      cancel_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1002/cancel',
      rerun_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1002/rerun',
      previous_attempt_url: null,
      workflow_url: 'https://api.github.com/repos/test-org/test-repo/actions/workflows/202',
    },
  ],
};

// Mock workflow jobs
export const mockJobs: Record<number, Job[]> = {
  1001: [
    {
      id: 501,
      run_id: 1001,
      workflow_name: 'CI',
      run_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1001',
      run_attempt: 1,
      node_id: 'MDExOkpvYjUwMQ==',
      url: 'https://api.github.com/repos/test-org/test-repo/actions/jobs/501',
      html_url: 'https://github.com/test-org/test-repo/actions/runs/1001/jobs/501',
      status: 'completed',
      conclusion: 'success',
      created_at: '2025-05-03T14:00:00Z',
      started_at: '2025-05-03T14:00:00Z',
      completed_at: '2025-05-03T14:08:00Z',
      name: 'build',
      labels: ['ubuntu-latest'],
      steps: [
        {
          name: 'Checkout repository',
          status: 'completed',
          conclusion: 'success',
          number: 1,
          started_at: '2025-05-03T14:00:00Z',
          completed_at: '2025-05-03T14:02:00Z',
        },
        {
          name: 'Install dependencies',
          status: 'completed',
          conclusion: 'success',
          number: 2,
          started_at: '2025-05-03T14:02:00Z',
          completed_at: '2025-05-03T14:08:00Z',
        },
      ],
    },
  ],
  1002: [
    {
      id: 502,
      run_id: 1002,
      workflow_name: 'Deploy',
      run_url: 'https://api.github.com/repos/test-org/test-repo/actions/runs/1002',
      run_attempt: 1,
      node_id: 'MDExOkpvYjUwMg==',
      url: 'https://api.github.com/repos/test-org/test-repo/actions/jobs/502',
      html_url: 'https://github.com/test-org/test-repo/actions/runs/1002/jobs/502',
      status: 'completed',
      conclusion: 'failure',
      created_at: '2025-05-03T15:00:00Z',
      started_at: '2025-05-03T15:00:00Z',
      completed_at: '2025-05-03T15:12:00Z',
      name: 'deploy',
      labels: ['ubuntu-latest'],
      steps: [
        {
          name: 'Checkout repository',
          status: 'completed',
          conclusion: 'success',
          number: 1,
          started_at: '2025-05-03T15:00:00Z',
          completed_at: '2025-05-03T15:02:00Z',
        },
        {
          name: 'Deploy to production',
          status: 'completed',
          conclusion: 'failure',
          number: 2,
          started_at: '2025-05-03T15:02:00Z',
          completed_at: '2025-05-03T15:12:00Z',
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
