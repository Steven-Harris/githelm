import { derived, type Readable } from 'svelte/store';
import { firebase, authState } from '$integrations/firebase';
import { repositoryFacade } from '$shared/stores/facades/repository.facade';
import { authService } from '$shared/auth/auth.service';

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
  }> {
    return derived(
      [firebase.user, authState, this.getHasAnyConfigs()],
      ([$user, $authState, $hasAnyConfigs]) => {
        const signedIn = $user !== null;
        const isAuth = $authState;
        const isAuthLoading = $authState === 'initializing' || $authState === 'authenticating';
        const shouldShowContent = signedIn && $authState === 'authenticated' && $hasAnyConfigs;
        const shouldShowConfigurePrompt = signedIn && $authState === 'authenticated' && !$hasAnyConfigs;

        return {
          signedIn,
          isAuth,
          isAuthLoading,
          shouldShowContent,
          shouldShowConfigurePrompt
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

  login(): void {
    authService.signIn();
  }

  goToConfig(): void {
    window.location.href = '/config';
  }
}

export const homePageService = HomePageService.getInstance();
