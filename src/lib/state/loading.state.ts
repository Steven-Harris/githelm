import { writable, derived } from 'svelte/store';
import { loggerService } from '$lib/logging/logger.service';

export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface LoadingContext {
  message: string;
  progress?: number;
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface LoadingTask {
  id: string;
  state: LoadingState;
  context: LoadingContext;
}

class LoadingStateMachine {
  private tasks = writable<Map<string, LoadingTask>>(new Map());
  private globalState = writable<LoadingState>(LoadingState.IDLE);

  constructor() {
    this.updateGlobalState();
  }

  startTask(id: string, message: string = 'Loading...'): void {
    const task: LoadingTask = {
      id,
      state: LoadingState.LOADING,
      context: {
        message,
        startTime: Date.now(),
      },
    };

    this.tasks.update(tasks => {
      tasks.set(id, task);
      return tasks;
    });

    this.updateGlobalState();
    this.logTaskEvent(id, 'started', message);
  }

  completeTask(id: string, message?: string): void {
    this.tasks.update(tasks => {
      const task = tasks.get(id);
      if (task) {
        task.state = LoadingState.SUCCESS;
        task.context.endTime = Date.now();
        if (message) {
          task.context.message = message;
        }
        tasks.set(id, task);
      }
      return tasks;
    });

    this.updateGlobalState();
    this.logTaskEvent(id, 'completed', message);
  }

  failTask(id: string, error: string, message?: string): void {
    this.tasks.update(tasks => {
      const task = tasks.get(id);
      if (task) {
        task.state = LoadingState.ERROR;
        task.context.endTime = Date.now();
        task.context.error = error;
        if (message) {
          task.context.message = message;
        }
        tasks.set(id, task);
      }
      return tasks;
    });

    this.updateGlobalState();
    this.logTaskEvent(id, 'failed', error);
  }

  updateTaskProgress(id: string, progress: number): void {
    this.tasks.update(tasks => {
      const task = tasks.get(id);
      if (task && task.state === LoadingState.LOADING) {
        task.context.progress = Math.min(100, Math.max(0, progress));
        tasks.set(id, task);
      }
      return tasks;
    });
  }

  removeTask(id: string): void {
    this.tasks.update(tasks => {
      tasks.delete(id);
      return tasks;
    });

    this.updateGlobalState();
    this.logTaskEvent(id, 'removed');
  }

  clearAllTasks(): void {
    this.tasks.set(new Map());
    this.globalState.set(LoadingState.IDLE);
    loggerService.info('All loading tasks cleared', {
      component: 'LoadingStateMachine',
      action: 'clearAllTasks',
    });
  }

  getTask(id: string): LoadingTask | undefined {
    let tasks: Map<string, LoadingTask>;
    this.tasks.subscribe(t => tasks = t)();
    return tasks!.get(id);
  }

  isTaskLoading(id: string): boolean {
    const task = this.getTask(id);
    return task?.state === LoadingState.LOADING;
  }

  isAnyTaskLoading(): boolean {
    let tasks: Map<string, LoadingTask>;
    this.tasks.subscribe(t => tasks = t)();
    return Array.from(tasks!.values()).some(task => task.state === LoadingState.LOADING);
  }

  getActiveTasks(): LoadingTask[] {
    let tasks: Map<string, LoadingTask>;
    this.tasks.subscribe(t => tasks = t)();
    return Array.from(tasks!.values()).filter(task => 
      task.state === LoadingState.LOADING || task.state === LoadingState.ERROR
    );
  }

  getTaskStats(): {
    total: number;
    loading: number;
    success: number;
    error: number;
    idle: number;
  } {
    let tasks: Map<string, LoadingTask>;
    this.tasks.subscribe(t => tasks = t)();
    
    const taskArray = Array.from(tasks!.values());
    return {
      total: taskArray.length,
      loading: taskArray.filter(t => t.state === LoadingState.LOADING).length,
      success: taskArray.filter(t => t.state === LoadingState.SUCCESS).length,
      error: taskArray.filter(t => t.state === LoadingState.ERROR).length,
      idle: taskArray.filter(t => t.state === LoadingState.IDLE).length,
    };
  }

  private updateGlobalState(): void {
    this.tasks.update(tasks => {
      const activeTasks = Array.from(tasks.values());
      const hasLoading = activeTasks.some(task => task.state === LoadingState.LOADING);
      const hasError = activeTasks.some(task => task.state === LoadingState.ERROR);
      const hasSuccess = activeTasks.some(task => task.state === LoadingState.SUCCESS);

      let newGlobalState: LoadingState;
      if (hasLoading) {
        newGlobalState = LoadingState.LOADING;
      } else if (hasError) {
        newGlobalState = LoadingState.ERROR;
      } else if (hasSuccess) {
        newGlobalState = LoadingState.SUCCESS;
      } else {
        newGlobalState = LoadingState.IDLE;
      }

      this.globalState.set(newGlobalState);
      return tasks;
    });
  }

  private logTaskEvent(taskId: string, event: string, message?: string): void {
    loggerService.debug(`Loading task ${event}: ${taskId}`, {
      component: 'LoadingStateMachine',
      action: `task${event.charAt(0).toUpperCase() + event.slice(1)}`,
      data: { taskId, message },
    });
  }


  getTasks() {
    return this.tasks;
  }

  getGlobalState() {
    return this.globalState;
  }
}

const loadingStateMachine = new LoadingStateMachine();

export const loadingTasks = loadingStateMachine.getTasks();
export const globalLoadingState = loadingStateMachine.getGlobalState();

export const isLoading = derived(globalLoadingState, ($state) => $state === LoadingState.LOADING);
export const hasLoadingError = derived(globalLoadingState, ($state) => $state === LoadingState.ERROR);
export const isLoadingSuccess = derived(globalLoadingState, ($state) => $state === LoadingState.SUCCESS);

export const {
  startTask,
  completeTask,
  failTask,
  updateTaskProgress,
  removeTask,
  clearAllTasks,
  getTask,
  isTaskLoading,
  isAnyTaskLoading,
  getActiveTasks,
  getTaskStats,
} = loadingStateMachine;
