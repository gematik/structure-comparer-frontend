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
 * Application routing configuration
 * Defines the navigation paths and their corresponding components
 */
import { Routes } from '@angular/router';
import { EditProjectComponent } from './edit-project/edit-project.component';
import { MappingDetailComponent } from './mapping-detail/mapping-detail.component';
import { TransformationDetailComponent } from './transformation-detail/transformation-detail.component';
import { ProjectListComponent } from './project-list/project-list.component';
import { ProfileComparisonComponent } from './profile-comparison/profile-comparison.component';
import { TargetCreationDetailComponent } from './target-creation-detail/target-creation-detail.component';

export const routes: Routes = [
  // Default route redirects to project list
  { path: '', redirectTo: '/project', pathMatch: 'full' },
  // Project list page (home)
  { path: 'project', component: ProjectListComponent, data: { breadcrumb: 'Home'} },
  // Individual project editing page
  { path: 'project/:projectKey', component: EditProjectComponent, data: { breadcrumb: 'Project'} },
  // Mapping detail page for specific mapping within a project
  { path: 'project/:projectKey/mapping/:mappingId', component: MappingDetailComponent, data: { breadcrumb: 'Mapping Detail'} },
  // Transformation detail page for specific transformation within a project
  { path: 'project/:projectKey/transformation/:transformationId', component: TransformationDetailComponent, data: { breadcrumb: 'Transformation Detail'} },
  // Target Creation detail page for specific target creation within a project
  { path: 'project/:projectKey/target-creation/:targetCreationId', component: TargetCreationDetailComponent, data: { breadcrumb: 'Target Creation Detail'} },
  // Profile comparison page for comparing profiles within a project
  { path: 'project/:projectKey/comparison/:comparisonId', component: ProfileComparisonComponent, data: { breadcrumb: 'Profile Comparison'} },
];


