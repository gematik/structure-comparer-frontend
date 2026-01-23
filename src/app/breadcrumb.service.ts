/*
 *
 * Copyright 2025 gematik GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * *******
 *
 * For additional notes and disclaimer from gematik and in case of changes by gematik find details in the "Readme" file.
 */
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

        // ===== PHASE 9.1: Target Creation Breadcrumb Enhancement =====
        // Customize target creation detail breadcrumb to include entity identifier
        // Note: Currently uses ID from route params. Future enhancement could
        // load actual target creation name via async service call
        if (label === 'Target Creation Detail' && currentRoute.params['targetCreationId']) {
          const targetCreationId = currentRoute.params['targetCreationId'];
          finalLabel = `Target Creation: ${targetCreationId}`;
        }
        // ===== END PHASE 9.1 =====

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
