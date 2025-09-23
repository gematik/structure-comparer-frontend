/**
 * Application routing configuration
 * Defines the navigation paths and their corresponding components
 */
import { Routes } from '@angular/router';
import { EditProjectComponent } from './edit-project/edit-project.component';
import { MappingDetailComponent } from './mapping-detail/mapping-detail.component';
import { ProjectListComponent } from './project-list/project-list.component';
import { ProfileComparisonComponent } from './profile-comparison/profile-comparison.component';

export const routes: Routes = [
  // Default route redirects to project list
  { path: '', redirectTo: '/project', pathMatch: 'full' },
  // Project list page (home)
  { path: 'project', component: ProjectListComponent, data: { breadcrumb: 'Home'} },
  // Individual project editing page
  { path: 'project/:projectKey', component: EditProjectComponent, data: { breadcrumb: 'Project'} },
  // Mapping detail page for specific mapping within a project
  { path: 'project/:projectKey/mapping/:mappingId', component: MappingDetailComponent, data: { breadcrumb: 'Mapping Detail'} },
  // Profile comparison page for comparing profiles within a project
  { path: 'project/:projectKey/comparison/:comparisonId', component: ProfileComparisonComponent, data: { breadcrumb: 'Profile Comparison'} },
];


