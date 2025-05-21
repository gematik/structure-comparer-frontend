import { Routes } from '@angular/router';
import { EditProjectComponent } from './edit-project/edit-project.component';
import { MappingDetailComponent } from './mapping-detail/mapping-detail.component';
import { ProjectListComponent } from './project-list/project-list.component';
import { ProfileComparisonComponent } from './profile-comparison/profile-comparison.component';

export const routes: Routes = [
  { path: '', redirectTo: '/project', pathMatch: 'full' },
  { path: 'project', component: ProjectListComponent, data: { breadcrumb: 'Home'} },
  { path: 'project/:projectKey', component: EditProjectComponent, data: { breadcrumb: 'Project'} },
  { path: 'project/:projectKey/mapping/:mappingId', component: MappingDetailComponent, data: { breadcrumb: 'Mapping Detail'} },
  { path: 'project/:projectKey/comparison/:comparisonId', component: ProfileComparisonComponent, data: { breadcrumb: 'Profile Comparison'} },
  
  
];


