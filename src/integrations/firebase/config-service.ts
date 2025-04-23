import { collection, doc, getDoc, setDoc} from 'firebase/firestore';
import { get } from 'svelte/store';
import { firebase } from './client';
import { type Configs, type RepoConfig, type Organization } from './types';

export class ConfigService {
  public async getConfigs(): Promise<Configs> {
    const user = get(firebase.user);
    if (!user?.uid) {
      return { pullRequests: [], actions: [], organizations: [] };
    }

    const db = firebase.getDb();
    const docRef = doc(collection(db, "configs"), user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { pullRequests: [], actions: [], organizations: [] };
    }

    const data = docSnap.data() as Configs;
    return this.mapConfigs(data);
  }

  public async saveConfigs(configs: Configs) {
    const user = get(firebase.user);
    if (!user) {
      return;
    }

    const db = firebase.getDb();
    const docRef = doc(collection(db, "configs"), user.uid);
    await setDoc(docRef, { 
      pullRequests: this.mapRepoConfigs(configs.pullRequests || []), 
      actions: this.mapRepoConfigs(configs.actions || []),
      organizations: configs.organizations || [] 
    });
  }
  
  public async saveOrganizations(organizations: Organization[]) {
    const configs = await this.getConfigs();
    configs.organizations = organizations;
    await this.saveConfigs(configs);
  }
  
  private mapConfigs(configs: Configs): Configs {
    return {
      pullRequests: this.mapRepoConfigs(configs.pullRequests),
      actions: this.mapRepoConfigs(configs.actions),
      organizations: configs.organizations || []
    };
  }
  
  private mapRepoConfigs(configs: RepoConfig[]): RepoConfig[] {
    return configs.map(config => ({
      org: config.org,
      repo: config.repo,
      filters: config.filters || []
    }));
  }
}

export const configService = new ConfigService();