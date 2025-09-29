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
import { PackageUploadDialogComponent } from '../package-upload-dialog/package-upload-dialog.component';
import { UpdatePackageNameDialogComponent } from '../update-package-name-dialog/update-package-name-dialog.component';
import { AddMappingDialogComponent } from '../add-mapping-dialog/add-mapping-dialog.component';
import { PackageService } from '../package.service';

@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, MatButtonModule, MatIcon],
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
  
  // FontAwesome icons for UI elements
  faEdit = faEdit;   // Icon für den Edit-Button
  faPlus = faPlus;   // Icon für den Plus-Button
  faTrash = faTrash; // Icon für den Delete-Button
  
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
   * Diese Methode ist der Fallback, falls das Übertragen der Daten aus dem Aufruf dieser Seite nicht funktioniert hat.
   */
  private async reloadProject() {
    const projectKey = this.route.snapshot.paramMap.get('projectKey');
    if (projectKey) {
      try {
        const data = await firstValueFrom(this.projectService.reloadProjectData(projectKey));
        this.projectData = data;
        console.log('Projekt geladen:', data);
      } catch (error) {
        console.error('Fehler beim Laden des Projekts:', error);
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
        console.log('Datei erhalten:', result);
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
        console.log('Neuer Name:', result);
        // API call zum Umbenennen would be implemented here
      }
    });
  }

  deletePackageWithConfirm(packageId: string, packageName: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: { message: `Willst du das Package "${packageName}" wirklich löschen?` }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.packageService.deletePackage(this.projectKey, packageId).subscribe(() => {
          // Remove the deleted package from the local array
          this.packages = this.packages.filter(p => p.id !== packageId);
        });
      }
    });
  }

  /**
   * Deletes a comparison after user confirmation
   * @param id The ID of the comparison to delete
   */
  deleteComparisonWithConfirm(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: { message: 'Willst du diesen Vergleich wirklich löschen?' }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.comparisonService.deleteComparison(this.projectKey, id).subscribe(() => {
          // Remove the deleted comparison from the local array
          this.comparisons = this.comparisons.filter(c => c.id !== id);
        });
      }
    });
  }

  /**
   * Deletes a comparison directly without confirmation dialog
   * @param comparisonId The ID of the comparison to delete
   */
  deleteComparison(comparisonId: string) {
    this.comparisonService.deleteComparison(this.projectKey, comparisonId).subscribe(
      response => {
        console.log('Comparison deleted successfully:', response);
        // Remove the deleted comparison from the local array
        this.comparisons = this.comparisons.filter(comparison => comparison.id !== comparisonId);
      },
      error => {
        console.error('Error deleting comparison:', error);
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

  deleteMappingWithConfirm(mappingId: string, mappingName: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: { message: `Willst du die Zuordnung "${mappingName}" wirklich löschen?` }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.mappingsService.deleteMapping(this.projectKey, mappingId).subscribe(() => {
          // Remove the deleted mapping from the local array
          this.mappings = this.mappings.filter(m => m.id !== mappingId);
        });
      }
    });
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
        console.error('Fehler beim Erstellen des Vergleichs:', error);
      }
    );
  }
}
