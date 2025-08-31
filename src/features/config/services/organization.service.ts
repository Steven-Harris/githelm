import { configService } from '$integrations/firebase';
import type { Organization } from '$integrations/firebase';

export interface OrganizationState {
  organizations: Organization[];
}

export class OrganizationService {
  private static instance: OrganizationService;

  private constructor() {}

  static getInstance(): OrganizationService {
    if (!OrganizationService.instance) {
      OrganizationService.instance = new OrganizationService();
    }
    return OrganizationService.instance;
  }

  createInitialState(): OrganizationState {
    return {
      organizations: [],
    };
  }

  loadOrganizations(): Organization[] {
    return configService.getLocalOrganizations();
  }

  updateOrganizations(onStateUpdate: (updates: Partial<OrganizationState>) => void): void {
    const organizations = this.loadOrganizations();
    onStateUpdate({ organizations });
  }

  isOrganizationValid(selectedOrg: string, organizations: Organization[]): boolean {
    return !selectedOrg || organizations.some((org) => org.name === selectedOrg);
  }

  shouldResetOrganization(selectedOrg: string, organizations: Organization[]): boolean {
    return selectedOrg && !this.isOrganizationValid(selectedOrg, organizations);
  }

  getOrganizationNames(organizations: Organization[]): string[] {
    return organizations.map((org) => org.name);
  }

  hasOrganizations(organizations: Organization[]): boolean {
    return organizations.length > 0;
  }
}

export const organizationService = OrganizationService.getInstance();
