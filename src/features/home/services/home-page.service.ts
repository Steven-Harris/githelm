import { derived, type Readable } from 'svelte/store';
import { firebase, authState } from '$integrations/firebase';
import { repositoryFacade } from '$shared/stores/facades/repository.facade';
import { authService } from '$shared/auth/auth.service';
import { eventBus } from '$shared/stores/event-bus.store';
import { goto } from '$app/navigation';

export class HomePageService {
  private static instance: HomePageService;

  private constructor() {}

  static getInstance(): HomePageService {
    if (!HomePageService.instance) {
      HomePageService.instance = new HomePageService();
    }
    return HomePageService.instance;
  }

  getAuthState(): Readable<{
    signedIn: boolean;
    isAuth: string;
    isAuthLoading: boolean;
    shouldShowContent: boolean;
    shouldShowConfigurePrompt: boolean;
    isConfigLoading: boolean;
  }> {
    return derived(
      [firebase.user, authState, this.getHasAnyConfigs(), this.getConfigLoadingState()],
      ([$user, $authState, $hasAnyConfigs, $isConfigLoading]) => {
        const signedIn = $user !== null;
        const isAuth = $authState;
        const isAuthLoading = $authState === 'initializing' || $authState === 'authenticating';
        const isConfigLoading = $isConfigLoading;
        const shouldShowContent = signedIn && $authState === 'authenticated' && $hasAnyConfigs && !isConfigLoading;
        const shouldShowConfigurePrompt = signedIn && $authState === 'authenticated' && !$hasAnyConfigs && !isConfigLoading;

        return {
          signedIn,
          isAuth,
          isAuthLoading,
          shouldShowContent,
          shouldShowConfigurePrompt,
          isConfigLoading
        };
      }
    );
  }

  getHasAnyConfigs(): Readable<boolean> {
    return derived(
      [repositoryFacade.getPullRequestConfigsStore(), repositoryFacade.getActionsConfigsStore()],
      ([$prConfigs, $actionConfigs]) => {
        const prConfigs = Array.isArray($prConfigs) ? $prConfigs : [];
        const actionConfigs = Array.isArray($actionConfigs) ? $actionConfigs : [];
        return prConfigs.length > 0 || actionConfigs.length > 0;
      }
    );
  }

  getConfigLoadingState(): Readable<boolean> {
    return derived(eventBus, ($eventBus) => {
      return $eventBus === 'loading-configurations';
    });
  }

  login(): void {
    authService.signIn();
  }

  goToConfig(): void {
    goto('/config');
  }
}

export const homePageService = HomePageService.getInstance();
