import { Routes } from '@angular/router';
import { EditProjectComponent } from './edit-project/edit-project.component';
import { MappingDetailComponent } from './mapping-detail/mapping-detail.component';
import { ProjectListComponent } from './project-list/project-list.component';

export const routes: Routes = [
  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  { path: 'projects', component: ProjectListComponent },
  { path: 'edit-project/:projectKey', component: EditProjectComponent },
  { path: 'project/:projectKey/mapping/:mappingId', component: MappingDetailComponent },
];
