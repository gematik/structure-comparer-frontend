import { Routes } from '@angular/router';
import { MappingsListComponent } from './mappings-list/mappings-list.component';
import { MappingDetailComponent } from './mapping-detail/mapping-detail.component';
import { ProjectListComponent } from './project-list/project-list.component';

export const routes: Routes = [
  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  { path: 'projects', component: ProjectListComponent },
  { path: 'mapping', component: MappingsListComponent }, 
  { path: 'mapping/:id', component: MappingDetailComponent },
];