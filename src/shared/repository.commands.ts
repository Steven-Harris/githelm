import { repositoryFacade } from '$shared/stores/facades/repository.facade';
import { errorService } from '$shared/error/error.service';
import { loggerService } from '$shared/logging/logger.service';
import type { RepoConfig } from '$integrations/firebase';
import type { CombinedConfig } from '$features/config/stores/config.store';

export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface Command {
  execute(): Promise<CommandResult>;
  canUndo(): boolean;
  undo(): Promise<CommandResult>;
}

export class LoadRepositoryConfigsCommand implements Command {
  constructor() {}

  async execute(): Promise<CommandResult> {
    try {
      await repositoryFacade.loadAllConfigurations();
      loggerService.info('Repository configurations loaded successfully', {
        action: 'loadRepositoryConfigs',
      });
      return { success: true };
    } catch (error) {
      const errorResult = errorService.handleError(error, {
        action: 'loadRepositoryConfigs',
      });
      return {
        success: false,
        error: errorResult.error,
        errorCode: errorResult.errorCode,
      };
    }
  }

  canUndo(): boolean {
    return false;
  }

  async undo(): Promise<CommandResult> {
    return { success: false, error: 'Cannot undo loading configurations' };
  }
}

export class UpdateRepositoryConfigsCommand implements Command {
  private previousConfigs: CombinedConfig[] = [];
  private newConfigs: CombinedConfig[];

  constructor(configs: CombinedConfig[]) {
    this.newConfigs = configs;
  }

  async execute(): Promise<CommandResult> {
    try {
      this.previousConfigs = await repositoryFacade.getCombinedConfigurations();
      
      await repositoryFacade.updateConfigurations(this.newConfigs);
      
      loggerService.info('Repository configurations updated successfully', {
        action: 'updateRepositoryConfigs',
        data: { configCount: this.newConfigs.length },
      });
      
      return { success: true };
    } catch (error) {
      const errorResult = errorService.handleError(error, {
        action: 'updateRepositoryConfigs',
      });
      return {
        success: false,
        error: errorResult.error,
        errorCode: errorResult.errorCode,
      };
    }
  }

  canUndo(): boolean {
    return this.previousConfigs.length > 0;
  }

  async undo(): Promise<CommandResult> {
    if (!this.canUndo()) {
      return { success: false, error: 'Cannot undo: no previous state available' };
    }

    try {
      await repositoryFacade.updateConfigurations(this.previousConfigs);
      loggerService.info('Repository configurations reverted successfully', {
        action: 'undoUpdateRepositoryConfigs',
      });
      return { success: true };
    } catch (error) {
      const errorResult = errorService.handleError(error, {
        action: 'undoUpdateRepositoryConfigs',
      });
      return {
        success: false,
        error: errorResult.error,
        errorCode: errorResult.errorCode,
      };
    }
  }
}

export class RefreshPullRequestsCommand implements Command {
  private configs: RepoConfig[];

  constructor(configs: RepoConfig[]) {
    this.configs = configs;
  }

  async execute(): Promise<CommandResult> {
    try {
      await repositoryFacade.refreshPullRequestsData(this.configs);
      loggerService.info('Pull requests data refreshed successfully', {
        action: 'refreshPullRequests',
        data: { configCount: this.configs.length },
      });
      return { success: true };
    } catch (error) {
      const errorResult = errorService.handleError(error, {
        action: 'refreshPullRequests',
      });
      return {
        success: false,
        error: errorResult.error,
        errorCode: errorResult.errorCode,
      };
    }
  }

  canUndo(): boolean {
    return false;
  }

  async undo(): Promise<CommandResult> {
    return { success: false, error: 'Cannot undo data refresh' };
  }
}

export class RefreshActionsCommand implements Command {
  private configs: RepoConfig[];

  constructor(configs: RepoConfig[]) {
    this.configs = configs;
  }

  async execute(): Promise<CommandResult> {
    try {
      await repositoryFacade.refreshActionsData(this.configs);
      loggerService.info('Actions data refreshed successfully', {
        action: 'refreshActions',
        data: { configCount: this.configs.length },
      });
      return { success: true };
    } catch (error) {
      const errorResult = errorService.handleError(error, {
        action: 'refreshActions',
      });
      return {
        success: false,
        error: errorResult.error,
        errorCode: errorResult.errorCode,
      };
    }
  }

  canUndo(): boolean {
    return false;
  }

  async undo(): Promise<CommandResult> {
    return { success: false, error: 'Cannot undo data refresh' };
  }
}

export class ClearAllStoresCommand implements Command {
  private previousState: any = null;

  constructor() {}

  async execute(): Promise<CommandResult> {
    try {
      this.previousState = {
        pullRequests: repositoryFacade.getPullRequestsStore(),
        workflowRuns: repositoryFacade.getWorkflowRunsStore(),
        configs: repositoryFacade.getPullRequestConfigsStore(),
      };
      
      repositoryFacade.clearAllStores();
      loggerService.info('All stores cleared successfully', {
        action: 'clearAllStores',
      });
      return { success: true };
    } catch (error) {
      const errorResult = errorService.handleError(error, {
        action: 'clearAllStores',
      });
      return {
        success: false,
        error: errorResult.error,
        errorCode: errorResult.errorCode,
      };
    }
  }

  canUndo(): boolean {
    return false;
  }

  async undo(): Promise<CommandResult> {
    return { success: false, error: 'Cannot undo clearing stores' };
  }
}

export class CommandExecutor {
  private static instance: CommandExecutor;
  private commandHistory: Command[] = [];
  private maxHistorySize = 50;

  private constructor() {}

  static getInstance(): CommandExecutor {
    if (!CommandExecutor.instance) {
      CommandExecutor.instance = new CommandExecutor();
    }
    return CommandExecutor.instance;
  }

  async executeCommand(command: Command): Promise<CommandResult> {
    try {
      const result = await command.execute();
      
      if (result.success) {
        this.addToHistory(command);
      }
      
      return result;
    } catch (error) {
      const errorResult = errorService.handleError(error, {
        action: 'executeCommand',
      });
      return {
        success: false,
        error: errorResult.error,
        errorCode: errorResult.errorCode,
      };
    }
  }

  async undoLastCommand(): Promise<CommandResult> {
    const lastCommand = this.commandHistory.pop();
    
    if (!lastCommand) {
      return { success: false, error: 'No commands to undo' };
    }

    if (!lastCommand.canUndo()) {
      return { success: false, error: 'Cannot undo this command' };
    }

    try {
      return await lastCommand.undo();
    } catch (error) {
      const errorResult = errorService.handleError(error, {
        action: 'undoCommand',
      });
      return {
        success: false,
        error: errorResult.error,
        errorCode: errorResult.errorCode,
      };
    }
  }

  private addToHistory(command: Command): void {
    this.commandHistory.push(command);
    
    // Limit history size
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift();
    }
  }

  getHistory(): Command[] {
    return [...this.commandHistory];
  }

  clearHistory(): void {
    this.commandHistory = [];
  }

  canUndo(): boolean {
    const lastCommand = this.commandHistory[this.commandHistory.length - 1];
    return lastCommand ? lastCommand.canUndo() : false;
  }
}

export const commandExecutor = CommandExecutor.getInstance();
