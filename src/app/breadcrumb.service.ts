/**
 * Service to generate breadcrumb navigation based on the current route
 * Dynamically creates breadcrumb items with labels and URLs for navigation
 */
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  constructor(private router: Router) {}

  /**
   * Generates breadcrumb items based on the current route structure
   * @param route The current activated route snapshot
   * @returns Array of breadcrumb items with labels and URLs
   */
  getBreadcrumbs(route: ActivatedRouteSnapshot): { label: string; url: string }[] {
    const breadcrumbs: { label: string; url: string }[] = [];
    let currentRoute: ActivatedRouteSnapshot | null = route;
    let url = '';
    let projectKey: string | null = null;

    // Traverse the route tree to build breadcrumbs
    while (currentRoute) {
      const pathSegments = currentRoute.url.map(s => s.path).filter(Boolean);
      if (pathSegments.length > 0) {
        url += '/' + pathSegments.join('/');
      }

      const label = currentRoute.data?.['breadcrumb'];

      // Store project key if found in route parameters
      if (currentRoute.params['projectKey']) {
        projectKey = currentRoute.params['projectKey'];
      }

      if (label) {
        let finalLabel = label;

        // Customize project label to include the project key
        if (label === 'Project' && projectKey) {
          finalLabel = `Project ${projectKey}`;
        }

        breadcrumbs.push({ label: finalLabel, url });
      }

      currentRoute = currentRoute.firstChild ?? null;
    }

    // Ensure "Home" breadcrumb is always present
    if (!breadcrumbs.some(b => b.label === 'Home')) {
      breadcrumbs.unshift({ label: 'Home', url: '/project' });
    }

    // Add project breadcrumb if missing but project key exists
    if (
      projectKey &&
      !breadcrumbs.some(b => b.label?.startsWith('Project')) &&
      breadcrumbs.length > 1
    ) {
      breadcrumbs.splice(1, 0, {
        label: `Project ${projectKey}`,
        url: `/project/${projectKey}`
      });
    }

    return breadcrumbs;
  }
}
