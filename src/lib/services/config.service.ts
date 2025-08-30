import { captureException } from '$integrations/sentry';
import { eventBus } from '$lib/stores/event-bus.store';
import { killSwitch } from '$lib/stores/kill-switch.store';
import { loadRepositoryConfigs, updateRepositoryConfigs, getCombinedConfigs } from '$lib/stores/repository-service';
import { get } from 'svelte/store';
import type { CombinedConfig } from '$lib/stores/repository-service';

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

  /**
   * Load all configurations
   */
  async loadConfigurations(): Promise<CombinedConfig[]> {
    try {
      await loadRepositoryConfigs();
      return await getCombinedConfigs();
    } catch (error) {
      captureException(error, { action: 'loadConfigurations' });
      throw error;
    }
  }

  /**
   * Save configurations
   */
  async saveConfigurations(configs: CombinedConfig[]): Promise<SaveConfigResult> {
    try {
      // Validate configurations before saving
      const validation = this.validateConfigurations(configs);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      await updateRepositoryConfigs(configs);
      
      // Trigger config updated event
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

  /**
   * Validate repository configuration
   */
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

  /**
   * Validate multiple configurations
   */
  validateConfigurations(configs: CombinedConfig[]): ConfigValidationResult {
    const errors: string[] = [];

    if (!configs || configs.length === 0) {
      errors.push('At least one repository configuration is required');
      return { isValid: false, errors };
    }

    // Check for duplicate configurations
    const repoKeys = configs.map(config => `${config.org}/${config.repo}`);
    const uniqueKeys = new Set(repoKeys);
    if (uniqueKeys.size !== repoKeys.length) {
      errors.push('Duplicate repository configurations are not allowed');
    }

    // Validate each configuration
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

  /**
   * Add new configuration
   */
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

  /**
   * Update existing configuration
   */
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

  /**
   * Remove configuration
   */
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

  /**
   * Reorder configurations
   */
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

  /**
   * Enable kill switch (pause updates)
   */
  enableKillSwitch(): void {
    killSwitch.set(true);
  }

  /**
   * Disable kill switch (resume updates)
   */
  disableKillSwitch(): void {
    killSwitch.set(false);
  }

  /**
   * Check if kill switch is active
   */
  isKillSwitchActive(): boolean {
    return get(killSwitch);
  }

  /**
   * Trigger configuration save event
   */
  triggerSaveEvent(): void {
    eventBus.set('save-config');
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();
