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
 * Component for editing and managing a specific project
 * Displays project details, packages, mappings, and comparisons
 * Provides functionality to add, edit, and delete project elements
 */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { firstValueFrom } from 'rxjs';

import { MappingsService } from '../mappings.service';
import { Comparison } from '../models/comparison.model';
import { Mapping } from '../models/mapping.model';
import { Package } from '../models/package.model';
import { ProjectService } from '../project.service';
import { AddComparisonDialogComponent } from '../add-comparison-dialog/add-comparison-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ComparisonService } from '../comparison.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PackageUploadDialogComponent } from '../package-upload-dialog/package-upload-dialog.component';
import { UpdatePackageNameDialogComponent } from '../update-package-name-dialog/update-package-name-dialog.component';
import { AddMappingDialogComponent } from '../add-mapping-dialog/add-mapping-dialog.component';
import { PackageService } from '../package.service';

@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, MatButtonModule, MatIcon, MatProgressSpinnerModule],
  templateUrl: './edit-project.component.html',
  styleUrl: './edit-project.component.css'
})
export class EditProjectComponent implements OnInit {

  // Arrays to hold project data
  packages: Package[] = [];
  comparisons: Comparison[] = [];
  mappings: Mapping[] = [];

  // Project identification
  projectName: string = '';
  projectKey: string = '';
  projectData: any;

  // Loading state for global operations
  isLoading = false;  // Track global loading state

  // FontAwesome icons for UI elements
  faEdit = faEdit;   // Icon fÃ¼r den Edit-Button
  faPlus = faPlus;   // Icon fÃ¼r den Plus-Button
  faTrash = faTrash; // Icon fÃ¼r den Delete-Button

  constructor(
    private route: ActivatedRoute,
    private mappingsService: MappingsService,
    private projectService: ProjectService,
    private comparisonService: ComparisonService,
    private router: Router,
    private dialog: MatDialog,
    private packageService: PackageService
  ) { }

  /**
   * Initializes the component by loading project data
   * Either uses cached data from service or reloads from server
   * Initialisierung der Komponente. Hier werden die Projektdaten geladen und bisher die Mappings herausgezogen
   */
  async ngOnInit() {
    this.projectData = this.projectService.getProjectData();
    this.projectKey = this.route.snapshot.paramMap.get('projectKey') || '';

    // If no cached data exists, reload from server
    if (!this.projectData) {
      console.warn('Project data not found in service. Reloading...');
      await this.reloadProject();
    }

    // Populate component properties with project data
    if (this.projectData) {
      this.projectName = this.projectData.name;
      this.mappings = this.projectData.mappings;
      this.packages = this.projectData.packages;
      this.comparisons = this.projectData.comparisons;
    } else {
      console.error('Project data could not be loaded!');
    }
  }

  /**
   * Fallback method to reload project data from server
   * Used when cached data is not available
   * Diese Methode ist der Fallback, falls das Ãœbertragen der Daten aus dem Aufruf dieser Seite nicht funktioniert hat.
   */
  private async reloadProject() {
    const projectKey = this.route.snapshot.paramMap.get('projectKey');
    if (projectKey) {
      try {
        const data = await firstValueFrom(this.projectService.reloadProjectData(projectKey));
        this.projectData = data;
        console.log('Project loaded:', data);
      } catch (error) {
        console.error('Error loading project:', error);
      }
    }
    console.log('Project data:', this.projectData);
  }

  /**
   * Navigates to the mapping detail page for a specific mapping
   * @param mappingId The ID of the mapping to view
   */
  goToMapping(mappingId: string): void {
    this.router.navigate([`/project`, this.projectKey, `mapping`, mappingId]);
  }

  /**
   * Navigates to the comparison page for a specific comparison
   * @param comparisonId The ID of the comparison to view
   */
  goToComparison(comparisonId: string): void {
    this.router.navigate([`/project`, this.projectKey, `comparison`, comparisonId]);
  }

  /**
   * Opens the package upload dialog for adding new packages to the project
   * @param projectKey The key of the current project
   */
  openPackageUploadDialog(projectKey: string) {
    const dialogRef = this.dialog.open(PackageUploadDialogComponent, {
      width: '400px',
      data: { projectKey }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('File received:', result);
        // Add the uploaded package to the local list
        this.packages.push(result);
      }
    });
  }

  /**
   * Opens the package name edit dialog for updating package display names
   * @param currentName The current display name of the package
   * @param projectKey The key of the current project
   * @param packageId The ID of the package to edit
   */
  editPackage(currentName: string, projectKey: string, packageId: string) {
    const dialogRef = this.dialog.open(UpdatePackageNameDialogComponent, {
      width: '400px',
      data: { currentName, projectKey, packageId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== null) {
        console.log('New name:', result);
        // API call zum Umbenennen would be implemented here
      }
    });
  }

  /**
   * Deletes a package after user confirmation and refreshes the component
   * Shows global loading overlay during deletion process
   * @param packageId The ID of the package to delete
   * @param packageName The display name of the package for confirmation message
   */
  deletePackageWithConfirm(packageId: string, packageName: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: { message: `Do you really want to delete the package "${packageName}"?` }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;

        this.packageService.deletePackage(this.projectKey, packageId).subscribe({
          next: () => {
            this.refreshProjectData();
          },
          error: (error) => {
            console.error('Error deleting package:', error);
            this.isLoading = false;
          }
        });
      }
    });
  }

  /**
   * Deletes a mapping after user confirmation and refreshes the data
   * Shows global loading overlay during deletion process
   * @param mappingId The ID of the mapping to delete
   * @param mappingName The name of the mapping for confirmation message
   */
  deleteMappingWithConfirm(mappingId: string, mappingName: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: { message: `Do you really want to delete the mapping "${mappingName}"?` }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;

        this.mappingsService.deleteMapping(this.projectKey, mappingId).subscribe({
          next: () => {
            this.refreshProjectData();
          },
          error: (error) => {
            console.error('Error deleting mapping:', error);
            this.isLoading = false;
          }
        });
      }
    });
  }

  /**
   * Deletes a comparison after user confirmation
   * Shows global loading overlay during deletion process
   * @param id The ID of the comparison to delete
   */
  deleteComparisonWithConfirm(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: { message: 'Do you really want to delete this comparison?' }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;

        this.comparisonService.deleteComparison(this.projectKey, id).subscribe({
          next: () => {
            // Remove the deleted comparison from the local array
            this.comparisons = this.comparisons.filter(c => c.id !== id);
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error deleting comparison:', error);
            this.isLoading = false;
          }
        });
      }
    });
  }

  /**
   * Opens the add comparison dialog and saves the result
   * @param projectKey The key of the current project
   */
  openAddComparisonDialogAndSave(projectKey: string) {
    this.dialog.open(AddComparisonDialogComponent, {
      width: '600px',
      data: { projectKey }
    }).afterClosed().subscribe(result => {
      if (result) {
        const comparisonData = this.mapToApiPayload(result);
        this.saveComparison(projectKey, comparisonData);
      }
    });
  }

  /**
   * Opens the add mapping dialog and saves the result
   * @param projectKey The key of the current project
   */
  openAddMappingDialog(projectKey: string) {
    this.dialog.open(AddMappingDialogComponent, {
      width: '600px',
      data: { projectKey }
    }).afterClosed().subscribe(result => {
      if (result) {
        const mappingData = this.mapToApiPayload(result);
        this.saveMapping(projectKey, mappingData);
      }
    });
  }

  /**
   * Saves a new mapping to the project
   * @param projectKey The key of the current project
   * @param mappingData The mapping data to save
   */
  private saveMapping(projectKey: string, mappingData: any) {
    this.mappingsService.addMapping(projectKey, mappingData).subscribe(
      mapping => {
        console.log('Mapping created successfully:', mapping);
        // Add the new mapping to the local list
        this.mappings.push(mapping);
      },
      error => {
        console.error('Error creating mapping:', error);
      }
    );
  }

  /**
   * Saves a new comparison to the project
   * @param projectKey The key of the current project
   * @param payload The comparison data to save
   */
  private saveComparison(projectKey: string, payload: any) {
    this.comparisonService.createComparison(projectKey, payload).subscribe(
      comparison => {
        // Add the new comparison to the local list
        this.comparisons.push(comparison);
      },
      error => {
        console.error('Error creating comparison:', error);
      }
    );
  }

  /**
   * Maps dialog result to API payload format
   * @param result The result from the dialog
   * @returns Formatted payload for API calls
   */
  private mapToApiPayload(result: any) {
    return {
      // Support both old and new format
      source_ids: result.sourceProfileKeys || [result.sourceProfileKey],
      target_id: result.targetProfileKey
    };
  }

  /**
   * Refreshes project data without full page reload
   * Uses global loading state for better UX
   * Recommended approach for better performance
   */
  private async refreshProjectData() {
    try {
      const data = await firstValueFrom(this.projectService.reloadProjectData(this.projectKey));
      this.projectData = data;
      this.projectName = data.name;
      this.mappings = data.mappings;
      this.packages = data.packages;
      this.comparisons = data.comparisons;
      console.log('Project data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing project data:', error);
    } finally {
      this.isLoading = false;
    }
  }


}
