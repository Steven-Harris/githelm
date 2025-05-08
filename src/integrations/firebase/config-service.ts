import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { get } from 'svelte/store';
import { firebase } from './client';
import { captureException } from '../sentry';
import { type Configs, type RepoConfig, type Organization } from './types';

let localOrganizations: Organization[] = [];
let hasUnsavedOrganizations = false;

export class ConfigService {
  public async getConfigs(): Promise<Configs> {
    try {
      const user = get(firebase.user);
      if (!user?.uid) {
        return { pullRequests: [], actions: [], organizations: [] };
      }

      const db = firebase.getDb();
      const docRef = doc(collection(db, 'configs'), user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { pullRequests: [], actions: [], organizations: [] };
      }

      const data = docSnap.data() as Configs;
      const configs = this.mapConfigs(data);

      if (localOrganizations.length === 0 && !hasUnsavedOrganizations) {
        localOrganizations = [...configs.organizations];
      }

      return configs;
    } catch (error) {
      captureException(error, {
        context: 'Firebase Config Service',
        function: 'getConfigs',
        userId: get(firebase.user)?.uid,
      });
      throw error;
    }
  }

  public async saveConfigs(configs: Configs) {
    try {
      const user = get(firebase.user);
      if (!user) {
        return;
      }

      if (hasUnsavedOrganizations) {
        configs.organizations = [...localOrganizations];
        hasUnsavedOrganizations = false;
      }

      const db = firebase.getDb();
      const docRef = doc(collection(db, 'configs'), user.uid);
      await setDoc(docRef, {
        pullRequests: this.mapRepoConfigs(configs.pullRequests || []),
        actions: this.mapRepoConfigs(configs.actions || []),
        organizations: configs.organizations || [],
      });
    } catch (error) {
      captureException(error, {
        context: 'Firebase Config Service',
        function: 'saveConfigs',
        userId: get(firebase.user)?.uid,
      });
      throw error;
    }
  }

  public async saveOrganizations(organizations: Organization[]) {
    try {
      const configs = await this.getConfigs();
      configs.organizations = organizations;
      await this.saveConfigs(configs);
    } catch (error) {
      captureException(error, {
        context: 'Firebase Config Service',
        function: 'saveOrganizations',
        userId: get(firebase.user)?.uid,
      });
      throw error;
    }
  }

  public getLocalOrganizations(): Organization[] {
    return localOrganizations;
  }

  public updateLocalOrganizations(organizations: Organization[]) {
    localOrganizations = [...organizations];
    hasUnsavedOrganizations = true;
    return localOrganizations;
  }

  public hasUnsavedOrganizationChanges(): boolean {
    return hasUnsavedOrganizations;
  }

  private mapConfigs(configs: Configs): Configs {
    return {
      pullRequests: this.mapRepoConfigs(configs.pullRequests),
      actions: this.mapRepoConfigs(configs.actions),
      organizations: configs.organizations || [],
    };
  }

  private mapRepoConfigs(configs: RepoConfig[]): RepoConfig[] {
    return configs.map((config) => ({
      org: config.org,
      repo: config.repo,
      filters: config.filters || [],
    }));
  }
}

export const configService = new ConfigService();
