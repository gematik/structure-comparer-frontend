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

  while (currentRoute) {
    const hasBreadcrumb = currentRoute.data?.['breadcrumb'];
    const pathSegments = currentRoute.url.map(s => s.path).filter(Boolean);

    if (pathSegments.length > 0) {
      url += '/' + pathSegments.join('/');
    }

    if (hasBreadcrumb) {
      breadcrumbs.push({
        label: currentRoute.data['breadcrumb'],
        url
      });
    }

    currentRoute = currentRoute.firstChild ?? null;
  }

  return breadcrumbs;
}




}
