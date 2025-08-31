import { configService } from '$integrations/firebase';
import type { Organization } from '$integrations/firebase';
import { eventBus } from '$shared/stores/event-bus.store';
import { captureException } from '$integrations/sentry';

export interface OrganizationManagerState {
  organizations: Organization[];
  newOrgName: string;
  loading: boolean;
}

export class OrganizationManagerService {
  private static instance: OrganizationManagerService;

  private constructor() {}

  static getInstance(): OrganizationManagerService {
    if (!OrganizationManagerService.instance) {
      OrganizationManagerService.instance = new OrganizationManagerService();
    }
    return OrganizationManagerService.instance;
  }

  createInitialState(): OrganizationManagerState {
    return {
      organizations: [],
      newOrgName: '',
      loading: false,
    };
  }

  async loadOrganizations(onStateUpdate: (updates: Partial<OrganizationManagerState>) => void): Promise<void> {
    onStateUpdate({ loading: true });

    try {
      const localOrgs = configService.getLocalOrganizations();
      if (localOrgs.length > 0) {
        onStateUpdate({ organizations: localOrgs, loading: false });
      } else {
        const configs = await configService.getConfigs();
        const organizations = configs.organizations || [];
        onStateUpdate({ organizations, loading: false });
      }
    } catch (error) {
      captureException(error);
      onStateUpdate({ loading: false });
    }
  }

  addOrganization(
    newOrgName: string,
    organizations: Organization[],
    onStateUpdate: (updates: Partial<OrganizationManagerState>) => void
  ): void {
    if (!newOrgName.trim()) return;

    const orgName = newOrgName.trim();

    if (organizations.some((org) => org.name.toLowerCase() === orgName.toLowerCase())) {
      alert('This organization is already added.');
      return;
    }

    try {
      const updatedOrganizations = [...organizations, { name: orgName }];
      configService.updateLocalOrganizations(updatedOrganizations);

      onStateUpdate({ 
        organizations: updatedOrganizations, 
        newOrgName: '' 
      });

      eventBus.set('organizations-updated');
    } catch (error) {
      captureException(error);
    }
  }

  deleteOrganization(
    index: number,
    organizations: Organization[],
    onStateUpdate: (updates: Partial<OrganizationManagerState>) => void
  ): void {
    if (!confirm('Are you sure you want to delete this organization? This may affect your repository configurations.')) {
      return;
    }

    try {
      // Update local state
      const updatedOrgs = [...organizations];
      updatedOrgs.splice(index, 1);

      // Update local orgs in the service (don't save to Firebase yet)
      configService.updateLocalOrganizations(updatedOrgs);

      onStateUpdate({ organizations: updatedOrgs });

      // Notify others about the change
      eventBus.set('organizations-updated');
    } catch (error) {
      captureException(error);
    }
  }

  validateOrganizationName(orgName: string, organizations: Organization[]): { isValid: boolean; error?: string } {
    if (!orgName.trim()) {
      return { isValid: false, error: 'Organization name cannot be empty' };
    }

    if (organizations.some((org) => org.name.toLowerCase() === orgName.toLowerCase())) {
      return { isValid: false, error: 'This organization is already added' };
    }

    return { isValid: true };
  }

  hasOrganizations(organizations: Organization[]): boolean {
    return organizations.length > 0;
  }
}

export const organizationManagerService = OrganizationManagerService.getInstance();
