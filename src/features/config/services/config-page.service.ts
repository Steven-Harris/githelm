import { derived, type Readable, get } from 'svelte/store';
import { eventBus } from '$shared/stores/event-bus.store';
import { configService } from '$features/config/services/config.service';
import { repositoryFacade } from '$shared/stores/facades/repository.facade';
import { errorService } from '$shared/error/error.service';
import { loggerService } from '$shared/logging/logger.service';
import { goto } from '$app/navigation';
import type { CombinedConfig } from '$features/config/stores/config.store';

export interface SaveState {
  isSaving: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

export class ConfigPageService {
  private static instance: ConfigPageService;

  private constructor() {
    this.initializeEventListeners();
  }

  static getInstance(): ConfigPageService {
    if (!ConfigPageService.instance) {
      ConfigPageService.instance = new ConfigPageService();
    }
    return ConfigPageService.instance;
  }

  getConfigurations(): Readable<CombinedConfig[]> {
    return derived(
      [repositoryFacade.getPullRequestConfigsStore(), repositoryFacade.getActionsConfigsStore()],
      ([$pullRequestConfigs, $actionsConfigs]) => {
        // Use the same merge logic as the config store
        const combined = new Map<string, CombinedConfig>();

        // Process pull request configs
        for (const config of $pullRequestConfigs) {
          const key = `${config.org}/${config.repo}`;
          if (!combined.has(key)) {
            combined.set(key, {
              org: config.org,
              repo: config.repo,
            });
          }

          const combinedConfig = combined.get(key)!;
          combinedConfig.pullRequests = config.filters || [];
        }

        // Process actions configs
        for (const config of $actionsConfigs) {
          const key = `${config.org}/${config.repo}`;
          if (!combined.has(key)) {
            combined.set(key, {
              org: config.org,
              repo: config.repo,
            });
          }

          const combinedConfig = combined.get(key)!;
          combinedConfig.actions = config.filters || [];
        }

        return Array.from(combined.values());
      }
    );
  }

  getLoadingState(): Readable<boolean> {
    return derived(eventBus, ($eventBus) => {
      // Only show loading for initial load, not for save operations
      return $eventBus === 'loading-configurations';
    });
  }

  getSaveState(): Readable<SaveState> {
    return derived(eventBus, ($eventBus) => {
      const isSaving = $eventBus === 'save-config';
      return {
        isSaving,
        hasError: false,
        errorMessage: null,
      };
    });
  }

  getErrorMessage(): Readable<string | null> {
    return derived(eventBus, ($eventBus) => {
      // This would be enhanced with actual error handling
      return null;
    });
  }

  async loadConfigurations(): Promise<void> {
    try {
      console.log('ConfigPageService: Setting loading state...');
      // Set loading state
      eventBus.set('loading-configurations');
      
      console.log('ConfigPageService: Loading all configurations...');
      await repositoryFacade.loadAllConfigurations();
      
      console.log('ConfigPageService: Clearing loading state...');
      // Clear loading state
      eventBus.set('');
      
      loggerService.info('Configurations loaded successfully', {
        component: 'ConfigPageService',
        action: 'loadConfigurations',
      });
    } catch (error) {
      console.error('ConfigPageService: Error loading configurations:', error);
      // Clear loading state on error
      eventBus.set('');
      
      const errorResult = errorService.handleError(error, {
        component: 'ConfigPageService',
        action: 'loadConfigurations',
      });
      
      loggerService.error('Failed to load configurations', {
        component: 'ConfigPageService',
        action: 'loadConfigurations',
        data: { error: errorResult.error },
      });
      
      throw error;
    }
  }

  async saveConfigurations(configs: CombinedConfig[]): Promise<void> {
    try {
      // Set save state
      eventBus.set('save-config');
      
      const result = await configService.saveConfigurations(configs);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save configurations');
      }
      
      // Clear save state and trigger config update event
      eventBus.set('config-updated');
      
      loggerService.info('Configurations saved successfully', {
        component: 'ConfigPageService',
        action: 'saveConfigurations',
        data: { configCount: configs.length },
      });
    } catch (error) {
      // Clear save state on error
      eventBus.set('');
      
      const errorResult = errorService.handleError(error, {
        component: 'ConfigPageService',
        action: 'saveConfigurations',
      });
      
      loggerService.error('Failed to save configurations', {
        component: 'ConfigPageService',
        action: 'saveConfigurations',
        data: { error: errorResult.error },
      });
      
      throw error;
    }
  }

  navigateToDashboard(): void {
    goto('/');
  }

  handleConfigUpdate(configs: CombinedConfig[]): void {
    loggerService.info('Configuration updated', {
      component: 'ConfigPageService',
      action: 'handleConfigUpdate',
      data: { configCount: configs.length },
    });
  }

  private initializeEventListeners(): void {
    // Event listeners can be added here if needed in the future
  }

  validateConfigurations(configs: CombinedConfig[]): boolean {
    try {
      const validation = configService.validateConfigurations(configs);
      return validation.isValid;
    } catch (error) {
      loggerService.error('Configuration validation failed', {
        component: 'ConfigPageService',
        action: 'validateConfigurations',
        data: { error },
      });
      return false;
    }
  }

  getConfigStats(): Readable<{ total: number; pullRequests: number; actions: number }> {
    return derived(this.getConfigurations(), ($configs) => {
      // Ensure configs is always an array
      const configs = Array.isArray($configs) ? $configs : [];
      const total = configs.length;
      const pullRequests = configs.filter(config => config.pullRequests && config.pullRequests.length > 0).length;
      const actions = configs.filter(config => config.actions && config.actions.length > 0).length;
      
      return { total, pullRequests, actions };
    });
  }
}

export const configPageService = ConfigPageService.getInstance();
