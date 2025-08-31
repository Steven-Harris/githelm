import { captureException } from '$integrations/sentry';
import { eventBus } from '$shared/stores/event-bus.store';
import { killSwitch } from '$shared/stores/kill-switch.store';
import { repositoryFacade } from '$shared/stores/facades/repository.facade';
import { get } from 'svelte/store';
import type { CombinedConfig } from '$features/config/stores/config.store';

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SaveConfigResult {
  success: boolean;
  error?: string;
}

export class ConfigService {
  private static instance: ConfigService;

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async loadConfigurations(): Promise<CombinedConfig[]> {
    try {
      await repositoryFacade.loadAllConfigurations();
      return await repositoryFacade.getCombinedConfigurations();
    } catch (error) {
      captureException(error, { action: 'loadConfigurations' });
      throw error;
    }
  }

  async saveConfigurations(configs: CombinedConfig[]): Promise<SaveConfigResult> {
    try {
      const validation = this.validateConfigurations(configs);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      await repositoryFacade.updateConfigurations(configs);
      
      eventBus.set('config-updated');
      
      return { success: true };
    } catch (error) {
      captureException(error, { action: 'saveConfigurations' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  validateRepositoryConfig(config: {
    org: string;
    repo: string;
    pullRequests?: string[];
    actions?: string[];
  }): ConfigValidationResult {
    const errors: string[] = [];

    if (!config.org || config.org.trim() === '') {
      errors.push('Organization name is required');
    }

    if (!config.repo || config.repo.trim() === '') {
      errors.push('Repository name is required');
    }

    if (!config.pullRequests && !config.actions) {
      errors.push('At least one monitoring type (Pull Requests or Actions) must be enabled');
    }

    if (config.actions && config.actions.length === 0) {
      errors.push('At least one workflow filter must be selected for Actions monitoring');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateConfigurations(configs: CombinedConfig[]): ConfigValidationResult {
    const errors: string[] = [];

    if (!configs || configs.length === 0) {
      errors.push('At least one repository configuration is required');
      return { isValid: false, errors };
    }

    const repoKeys = configs.map(config => `${config.org}/${config.repo}`);
    const uniqueKeys = new Set(repoKeys);
    if (uniqueKeys.size !== repoKeys.length) {
      errors.push('Duplicate repository configurations are not allowed');
    }

    configs.forEach((config, index) => {
      const validation = this.validateRepositoryConfig(config);
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          errors.push(`Config ${index + 1}: ${error}`);
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async addConfiguration(config: CombinedConfig): Promise<SaveConfigResult> {
    try {
      const currentConfigs = await this.loadConfigurations();
      const updatedConfigs = [...currentConfigs, config];
      return await this.saveConfigurations(updatedConfigs);
    } catch (error) {
      captureException(error, { action: 'addConfiguration' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add configuration',
      };
    }
  }

  async updateConfiguration(
    index: number,
    config: CombinedConfig
  ): Promise<SaveConfigResult> {
    try {
      const currentConfigs = await this.loadConfigurations();
      if (index < 0 || index >= currentConfigs.length) {
        return {
          success: false,
          error: 'Invalid configuration index',
        };
      }

      const updatedConfigs = [...currentConfigs];
      updatedConfigs[index] = config;
      return await this.saveConfigurations(updatedConfigs);
    } catch (error) {
      captureException(error, { action: 'updateConfiguration' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration',
      };
    }
  }

  async removeConfiguration(index: number): Promise<SaveConfigResult> {
    try {
      const currentConfigs = await this.loadConfigurations();
      if (index < 0 || index >= currentConfigs.length) {
        return {
          success: false,
          error: 'Invalid configuration index',
        };
      }

      const updatedConfigs = currentConfigs.filter((_, i) => i !== index);
      return await this.saveConfigurations(updatedConfigs);
    } catch (error) {
      captureException(error, { action: 'removeConfiguration' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove configuration',
      };
    }
  }

  async reorderConfigurations(
    fromIndex: number,
    toIndex: number
  ): Promise<SaveConfigResult> {
    try {
      const currentConfigs = await this.loadConfigurations();
      
      if (fromIndex < 0 || fromIndex >= currentConfigs.length ||
          toIndex < 0 || toIndex >= currentConfigs.length) {
        return {
          success: false,
          error: 'Invalid index for reordering',
        };
      }

      const updatedConfigs = [...currentConfigs];
      const [removed] = updatedConfigs.splice(fromIndex, 1);
      updatedConfigs.splice(toIndex, 0, removed);
      
      return await this.saveConfigurations(updatedConfigs);
    } catch (error) {
      captureException(error, { action: 'reorderConfigurations' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder configurations',
      };
    }
  }

  // List management methods
  createConfigFromSaveEvent(event: {
    pullRequests?: { org: string; repo: string; filters: string[] } | null;
    actions?: { org: string; repo: string; filters: string[] } | null;
  }): CombinedConfig | null {
    if (!event.pullRequests && !event.actions) {
      return null;
    }

    return {
      org: event.pullRequests?.org || event.actions?.org || '',
      repo: event.pullRequests?.repo || event.actions?.repo || '',
      pullRequests: event.pullRequests?.filters || [],
      actions: event.actions?.filters || [],
    };
  }

  updateConfigAtIndex(
    configs: CombinedConfig[],
    index: number,
    event: {
      pullRequests?: { org: string; repo: string; filters: string[] } | null;
      actions?: { org: string; repo: string; filters: string[] } | null;
    }
  ): CombinedConfig[] {
    const updatedConfigs = [...configs];
    
    if (event.pullRequests || event.actions) {
      const updatedConfig = this.createConfigFromSaveEvent(event);
      if (updatedConfig) {
        updatedConfigs[index] = updatedConfig;
      }
    } else {
      updatedConfigs.splice(index, 1);
    }
    
    return updatedConfigs;
  }

  addNewConfig(
    configs: CombinedConfig[],
    event: {
      pullRequests?: { org: string; repo: string; filters: string[] } | null;
      actions?: { org: string; repo: string; filters: string[] } | null;
    }
  ): CombinedConfig[] {
    if (event.pullRequests || event.actions) {
      const newConfig = this.createConfigFromSaveEvent(event);
      if (newConfig) {
        return [...configs, newConfig];
      }
    }
    return configs;
  }

  removeConfigAtIndex(configs: CombinedConfig[], index: number): CombinedConfig[] {
    const updatedConfigs = [...configs];
    updatedConfigs.splice(index, 1);
    return updatedConfigs;
  }

  reorderConfigs(
    configs: CombinedConfig[],
    fromIndex: number,
    toIndex: number
  ): CombinedConfig[] {
    const updatedConfigs = [...configs];
    const [removed] = updatedConfigs.splice(fromIndex, 1);
    updatedConfigs.splice(toIndex, 0, removed);
    return updatedConfigs;
  }

  enableKillSwitch(): void {
    killSwitch.set(true);
  }

  disableKillSwitch(): void {
    killSwitch.set(false);
  }

  isKillSwitchActive(): boolean {
    return get(killSwitch);
  }

  triggerSaveEvent(): void {
    eventBus.set('save-config');
  }
}


export const configService = ConfigService.getInstance();
