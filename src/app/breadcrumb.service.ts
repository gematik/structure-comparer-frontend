import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  constructor(private router: Router) {}

getBreadcrumbs(route: ActivatedRouteSnapshot): { label: string; url: string }[] {
  const breadcrumbs: { label: string; url: string }[] = [];
  let currentRoute: ActivatedRouteSnapshot | null = route;
  let url = '';
  let projectKey: string | null = null;

  while (currentRoute) {
    const pathSegments = currentRoute.url.map(s => s.path).filter(Boolean);
    if (pathSegments.length > 0) {
      url += '/' + pathSegments.join('/');
    }

    const label = currentRoute.data?.['breadcrumb'];

    // Merke projectKey, falls vorhanden
    if (currentRoute.params['projectKey']) {
      projectKey = currentRoute.params['projectKey'];
    }

    if (label) {
      let finalLabel = label;

      if (label === 'Project' && projectKey) {
        finalLabel = `Project ${projectKey}`;
      }

      breadcrumbs.push({ label: finalLabel, url });
    }

    currentRoute = currentRoute.firstChild ?? null;
  }

  // Manuell "Home" ergänzen, falls nicht vorhanden
  if (!breadcrumbs.some(b => b.label === 'Home')) {
    breadcrumbs.unshift({ label: 'Home', url: '/project' });
  }

  // Manuell "Project {{key}}" ergänzen, wenn er fehlt
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
