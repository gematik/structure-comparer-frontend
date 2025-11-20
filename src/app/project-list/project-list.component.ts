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
 * Component for displaying and managing the list of projects
 * Allows users to view, create, and navigate to individual projects
 */
import { Component, OnInit } from '@angular/core';
import { MappingsService } from '../mappings.service';
import { ProjectService } from '../project.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEdit, faTrash, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ComparisonService } from '../comparison.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatIcon, MatTooltipModule],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  // Object containing all projects data
  projects: any = {};
  // Name for creating a new project
  newProjectName: string = '';
  // Loading state for progress data
  isLoadingProgress = false;
  // Enhanced projects data with progress information
  projectsWithProgress: any[] = [];

  // FontAwesome icons used in the template
  faEye = faEye;
  faEdit = faEdit;
  faTrash = faTrash;
  faPlus = faPlus
  faTimes = faTimes;

  constructor(
    private mappingsService: MappingsService,
    private projectService: ProjectService,
    private comparisonService: ComparisonService,
    private router: Router,
    private dialog: MatDialog
  ) { }

  /**
   * Initializes the component by loading all available projects and their progress data
   */
  ngOnInit(): void {
    this.mappingsService.listProjects().subscribe(
      data => {
        this.projects = data;
        // Load progress data for all projects
        this.loadProjectsProgress();
      },
      error => console.error(error)
    );
  }

  /**
   * Loads a specific project and navigates to its detail page
   * @param projectURL The URL path of the project to load
   */
  loadProject(projectURL: string): void {
    this.mappingsService.initProject(projectURL).subscribe(
      (projectData) =>{
        // Cache the project data for use across the application
        this.projectService.setProjectData(projectData);
        this.router.navigate([projectURL])
      },
        error => console.error(error)
    );
  }

  /**
   * Creates a new project with the specified name
   * Converts the name to a URL-safe key format
   */
  createProject(): void {
    console.log('projekt',this.newProjectName);
    if (this.newProjectName.trim() === '') {
      alert('Project name is required');
      return;
    }
    // Convert project name to URL-safe key (replace spaces with underscores, lowercase)
    let projectKey : string = this.newProjectName.replace(/\s+/g, '_').toLowerCase();
    this.mappingsService.createProject(projectKey, this.newProjectName).subscribe(
      () => {
        this.projects.push(this.newProjectName);
        this.newProjectName = '';
      },
      error => console.error(error)
    );
  }

  /**
   * Deletes a project after user confirmation
   * @param project The project object to delete
   */
  deleteProject(project: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        message: `Möchten Sie das Projekt "${project.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Extract project key from URL
        const projectKey = project.url.replace('/project/', '');

        this.mappingsService.deleteProject(projectKey).subscribe(
          () => {
            // Remove project from local list
            const index = this.projects.projects.indexOf(project);
            if (index > -1) {
              this.projects.projects.splice(index, 1);
            }
            console.log(`Project ${project.name} deleted successfully`);
          },
          error => {
            console.error('Error deleting project:', error);
            // Zeige eine Fehlermeldung an (für jetzt als Alert, könnte später durch Snackbar ersetzt werden)
            alert('Fehler beim Löschen des Projekts. Eventuell ist diese Funktion noch nicht implementiert.');
          }
        );
      }
    });
  }

  /**
   * Loads progress information for all projects
   */
  private loadProjectsProgress(): void {
    if (!this.projects?.projects?.length) {
      this.projectsWithProgress = [];
      return;
    }

    this.isLoadingProgress = true;

    // Create an array of observables to load each project's data
    const projectRequests = this.projects.projects.map((project: any) => {
      const projectKey = this.extractProjectKey(project.url);

      return this.mappingsService.initProject(project.url).pipe(
        // After loading the project, load detailed data for each mapping
        switchMap((projectData: any) => {
          if (!projectData?.mappings?.length) {
            return of({
              ...project,
              progressSummary: {
                total: 0,
                compatible: 0,
                solved: 0,
                warning: 0,
                incompatible: 0,
                completionPercentage: 0,
                totalMappings: 0
              },
              projectData
            });
          }

          // Load detailed mapping data to get field counts
          const mappingRequests = projectData.mappings.map((mapping: any) => {
            return this.mappingsService.getMapping(projectKey, mapping.id).pipe(
              map((mappingDetail: any) => {
                // Use backend-provided counts directly
                return {
                  ...mapping,
                  total: mappingDetail.total || 0,
                  compatible: mappingDetail.compatible || 0,
                  solved: mappingDetail.solved || 0,
                  warning: mappingDetail.warning || 0,
                  incompatible: mappingDetail.incompatible || 0,
                  fields: mappingDetail.fields || []
                };
              }),
              catchError((error) => {
                return of({
                  ...mapping,
                  total: 0,
                  compatible: 0,
                  solved: 0,
                  warning: 0,
                  incompatible: 0,
                  fields: []
                });
              })
            );
          });

          // Load all mapping details in parallel
          return (forkJoin(mappingRequests) as any).pipe(
            map((hydratedMappings: any[]) => {
              const enhancedProjectData = {
                ...projectData,
                mappings: hydratedMappings
              };

              const progressSummary = this.calculateProjectProgress(enhancedProjectData);
              return {
                ...project,
                progressSummary,
                projectData: enhancedProjectData
              };
            })
          );
        }),
        catchError((error) => {
          return of({
            ...project,
            progressSummary: {
              total: 0,
              compatible: 0,
              solved: 0,
              warning: 0,
              incompatible: 0,
              completionPercentage: 0,
              totalMappings: 0
            },
            projectData: null
          });
        })
      );
    });

    // Execute all requests in parallel
    forkJoin(projectRequests).subscribe({
      next: (projectsWithProgressData) => {
        this.projectsWithProgress = projectsWithProgressData as any[];
        this.isLoadingProgress = false;
      },
      error: (error) => {
        this.isLoadingProgress = false;
      }
    });
  }

  /**
   * Extracts project key from project URL
   */
  private extractProjectKey(url: string): string {
    return url.replace('/project/', '');
  }

  /**
   * Calculates progress summary for a project by aggregating all mapping statistics
   * Uses the same 4 categories as detail page: compatible, solved, warning, incompatible
   */
  private calculateProjectProgress(projectData: any): any {
    if (!projectData?.mappings?.length) {
      return {
        total: 0,
        compatible: 0,
        solved: 0,
        warning: 0,
        incompatible: 0,
        completionPercentage: 0,
        totalMappings: 0
      };
    }

    const summary = {
      total: 0,
      compatible: 0,
      solved: 0,
      warning: 0,
      incompatible: 0,
      totalMappings: projectData.mappings.length
    };

    projectData.mappings.forEach((mapping: any) => {
      // Use backend-provided counts (new 4-category system)
      summary.total += mapping.total || 0;
      summary.compatible += mapping.compatible || 0;
      summary.solved += mapping.solved || 0;
      summary.warning += mapping.warning || 0;
      summary.incompatible += mapping.incompatible || 0;
    });

    const completionPercentage = summary.total > 0
      ? Math.round(((summary.compatible + summary.solved) / summary.total) * 100)
      : 0;

    return {
      ...summary,
      completionPercentage
    };
  }

  /**
   * Calculates counts from mapping fields if counts are not pre-calculated
   * Fallback method using basic classification logic
   */
  private calculateCountsFromFields(fields: any[]): any {
    const counts = {
      total: fields.length,
      compatible: 0,
      solved: 0,
      warning: 0,
      incompatible: 0
    };

    fields.forEach(field => {
      const classification = (field.classification || '').toString().toLowerCase();

      switch (classification) {
        case 'compatible':
          counts.compatible++;
          break;
        case 'warning':
          counts.warning++;
          break;
        case 'incompatible':
          counts.incompatible++;
          break;
      }
    });

    return counts;
  }

  /**
   * Gets the CSS class for project progress status
   */
  getProjectProgressClass(progressSummary: any): string {
    const completionPercentage = progressSummary.completionPercentage;

    if (completionPercentage >= 100) {
      return 'progress-completed';
    } else if (completionPercentage >= 80) {
      return 'progress-nearly-done';
    } else if (completionPercentage >= 50) {
      return 'progress-half-done';
    } else if (completionPercentage > 0) {
      return 'progress-in-progress';
    } else {
      return 'progress-not-started';
    }
  }

  /**
   * Gets a human-readable status description for project progress
   */
  getProjectStatusDescription(progressSummary: any): string {
    const completionPercentage = progressSummary.completionPercentage;

    if (progressSummary.total === 0) {
      return 'Keine Mappings vorhanden';
    }

    if (completionPercentage >= 100) {
      return 'Vollständig bearbeitet';
    } else if (completionPercentage >= 80) {
      return 'Fast vollständig';
    } else if (completionPercentage >= 50) {
      return 'Zur Hälfte bearbeitet';
    } else if (completionPercentage > 0) {
      return 'Teilweise bearbeitet';
    } else {
      return 'Noch nicht bearbeitet';
    }
  }

  /**
   * Gets the percentage for a specific category in the progress bar
   */
  getProjectProgressPercentage(progressSummary: any, category: string): number {
    if (progressSummary.total === 0) {
      return 0;
    }

    const value = progressSummary[category] || 0;
    return (value / progressSummary.total) * 100;
  }
}
