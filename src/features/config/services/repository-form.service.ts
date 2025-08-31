import { fetchRepositoryLabels, fetchRepositoryWorkflows } from '$integrations/github';
import { captureException } from '$integrations/sentry';
import type { CombinedConfig } from '$features/config/stores/config.store';

export interface FormState {
  selectedOrg: string;
  repoName: string;
  monitorPRs: boolean;
  prFilters: string[];
  availablePRLabels: string[];
  isLoadingLabels: boolean;
  monitorActions: boolean;
  actionFilters: string[];
  availableWorkflows: string[];
  isLoadingWorkflows: boolean;
}

export interface SaveEventData {
  pullRequests?: {
    org: string;
    repo: string;
    filters: string[];
  } | null;
  actions?: {
    org: string;
    repo: string;
    filters: string[];
  } | null;
}

export class RepositoryFormService {
  private static instance: RepositoryFormService;

  private constructor() {}

  static getInstance(): RepositoryFormService {
    if (!RepositoryFormService.instance) {
      RepositoryFormService.instance = new RepositoryFormService();
    }
    return RepositoryFormService.instance;
  }

  createInitialState(): FormState {
    return {
      selectedOrg: '',
      repoName: '',
      monitorPRs: false,
      prFilters: [],
      availablePRLabels: [],
      isLoadingLabels: false,
      monitorActions: false,
      actionFilters: [],
      availableWorkflows: [],
      isLoadingWorkflows: false,
    };
  }

  loadStateFromConfig(config: CombinedConfig): FormState {
    const state = this.createInitialState();
    
    state.selectedOrg = config.org;
    state.repoName = config.repo;

    // PRs: If pullRequests exists (even as empty array), monitoring is enabled
    if (config.pullRequests !== null && config.pullRequests !== undefined) {
      state.monitorPRs = true;
      state.prFilters = Array.isArray(config.pullRequests) ? [...config.pullRequests] : [];
    }

    // Actions: Only enable if there are actual workflows (not empty array)
    if (config.actions !== null && config.actions !== undefined && Array.isArray(config.actions) && config.actions.length > 0) {
      state.monitorActions = true;
      state.actionFilters = [...config.actions];
    }

    return state;
  }

  async loadLabels(org: string, repo: string): Promise<string[]> {
    if (!org || !repo) return [];

    try {
      return await fetchRepositoryLabels(org, repo);
    } catch (error) {
      captureException(error);
      return [];
    }
  }

  async loadWorkflows(org: string, repo: string): Promise<string[]> {
    if (!org || !repo) return [];

    try {
      return await fetchRepositoryWorkflows(org, repo);
    } catch (error) {
      captureException(error);
      return [];
    }
  }

  addPrFilter(filters: string[], filter: string): string[] {
    if (!filters.includes(filter)) {
      return [...filters, filter];
    }
    return filters;
  }

  removePrFilter(filters: string[], filter: string): string[] {
    return filters.filter((f) => f !== filter);
  }

  addActionFilter(filters: string[], filter: string): string[] {
    if (!filters.includes(filter)) {
      return [...filters, filter];
    }
    return filters;
  }

  removeActionFilter(filters: string[], filter: string): string[] {
    return filters.filter((f) => f !== filter);
  }

  validateForm(state: FormState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!state.selectedOrg || !state.repoName) {
      errors.push('Please select an organization and enter a repository name.');
    }

    if (!state.monitorPRs && !state.monitorActions) {
      errors.push('Please enable at least one of Pull Requests or Actions monitoring.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  createSaveEventData(state: FormState): SaveEventData {
    return {
      pullRequests: state.monitorPRs
        ? {
            org: state.selectedOrg,
            repo: state.repoName,
            filters: state.prFilters,
          }
        : null,
      actions: state.monitorActions
        ? {
            org: state.selectedOrg,
            repo: state.repoName,
            filters: state.actionFilters,
          }
        : null,
    };
  }

  shouldLoadLabels(state: FormState): boolean {
    return state.monitorPRs && 
           state.selectedOrg && 
           state.repoName && 
           state.availablePRLabels.length === 0;
  }

  shouldLoadWorkflows(state: FormState): boolean {
    return state.monitorActions && 
           state.selectedOrg && 
           state.repoName && 
           state.availableWorkflows.length === 0;
  }
}

export const repositoryFormService = RepositoryFormService.getInstance();
