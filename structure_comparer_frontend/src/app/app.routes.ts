import { Routes } from '@angular/router';
import { MappingsListComponent } from './mappings-list/mappings-list.component';
import { MappingDetailComponent } from './mapping-detail/mapping-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: '/mapping', pathMatch: 'full' },
  { path: 'mapping', component: MappingsListComponent }, 
  { path: 'mapping/:id', component: MappingDetailComponent },
];