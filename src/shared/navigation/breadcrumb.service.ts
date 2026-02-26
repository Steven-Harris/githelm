import { goto } from '$app/navigation';
import { page } from '$app/state';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
  iconType?: 'svg' | 'emoji';
}

class BreadcrumbService {
  /**
   * Generate breadcrumbs based on current route
   */
  generateBreadcrumbs(): BreadcrumbItem[] {
    const currentPath = page.url.pathname;
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      iconType: 'svg'
    });

    if (currentPath === '/') {
      // Home page - just dashboard
      return breadcrumbs;
    }

    if (currentPath === '/config') {
      breadcrumbs.push({
        label: 'Settings',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        iconType: 'svg'
      });
      return breadcrumbs;
    }

    // PR review pages: /pr/{owner}/{repo}/{number}
    const prMatch = currentPath.match(/^\/pr\/([^/]+)\/([^/]+)\/(\d+)$/);
    if (prMatch) {
      const [, owner, repo, number] = prMatch;

      breadcrumbs.push({
        label: `${owner}/${repo} • PR #${number}`,
        href: '/', // Go back to dashboard to see the repo
        icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10',
        iconType: 'svg'
      });

      return breadcrumbs;
    }

    // Fallback for unknown routes
    return breadcrumbs;
  }

  /**
   * Navigate to a breadcrumb item
   */
  navigateTo(item: BreadcrumbItem): void {
    if (item.href) {
      goto(item.href);
    }
  }

  /**
   * Get the parent breadcrumb (for back navigation)
   */
  getParentBreadcrumb(): BreadcrumbItem | null {
    const breadcrumbs = this.generateBreadcrumbs();
    if (breadcrumbs.length > 1) {
      return breadcrumbs[breadcrumbs.length - 2];
    }
    return null;
  }
}

export const breadcrumbService = new BreadcrumbService();
export type { BreadcrumbItem };
