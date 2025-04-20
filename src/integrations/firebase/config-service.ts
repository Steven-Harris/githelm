import { collection, doc, getDoc, setDoc} from 'firebase/firestore';
import { get } from 'svelte/store';
import { firebase } from './client';
import { type Configs, type RepoConfig } from './types';

export class ConfigService {
  public async getConfigs(): Promise<Configs> {
    const user = get(firebase.user);
    if (!user?.uid) {
      return { pullRequests: [], actions: [] };
    }

    const db = firebase.getDb();
    const docRef = doc(collection(db, "configs"), user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { pullRequests: [], actions: [] };
    }

    const data = docSnap.data() as Configs;
    return this.mapConfigs(data);
  }

  public async saveConfigs(prConfig: RepoConfig[], actionsConfig: RepoConfig[]) {
    const user = get(firebase.user);
    if (!user) {
      return;
    }

    const db = firebase.getDb();
    const docRef = doc(collection(db, "configs"), user.uid);
    await setDoc(docRef, { 
      pullRequests: this.mapRepoConfigs(prConfig), 
      actions: this.mapRepoConfigs(actionsConfig) 
    });
  }
  
  private mapConfigs(configs: Configs): Configs {
    return {
      pullRequests: this.mapRepoConfigs(configs.pullRequests),
      actions: this.mapRepoConfigs(configs.actions)
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