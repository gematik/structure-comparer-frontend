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
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MappingsService } from '../mappings.service';
import { Comparison } from '../models/comparison.model';
import { Mapping } from '../models/mapping.model';
import { Package } from '../models/package.model';
import { ProjectService } from '../project.service';
import { ComparisonService } from '../comparison.service';
import { PackageService } from '../package.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { AddComparisonDialogComponent } from '../add-comparison-dialog/add-comparison-dialog.component';
import { AddMappingDialogComponent } from '../add-mapping-dialog/add-mapping-dialog.component';
import { PackageUploadDialogComponent } from '../package-upload-dialog/package-upload-dialog.component';
import { UpdatePackageNameDialogComponent } from '../update-package-name-dialog/update-package-name-dialog.component';
import { ManualEntriesImportDialogComponent } from '../manual-entries-import-dialog/manual-entries-import-dialog.component';

// Import new sub-components
import { PackageListComponent } from '../shared/package-list/package-list.component';
import { ComparisonListComponent } from '../shared/comparison-list/comparison-list.component';
import { MappingListComponent } from '../shared/mapping-list/mapping-list.component';
import { LoadingOverlayComponent } from '../shared/loading-overlay/loading-overlay.component';





@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    PackageListComponent,
    ComparisonListComponent,
    MappingListComponent,
    LoadingOverlayComponent
  ],
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

  // Event handlers for sub-components
  onPackageDeleted(event: { id: string; name: string }): void {
    this.packages = this.packages.filter(p => p.name !== event.name);
    console.log(`Package ${event.name} deleted`);
  }

  onPackageUpdated(updatedPackage: Package): void {
    const index = this.packages.findIndex(p => p.name === updatedPackage.name);
    if (index !== -1) {
      this.packages[index] = updatedPackage;
    }
    console.log(`Package ${updatedPackage.name} updated`);
  }

  onComparisonViewed(comparisonId: string): void {
    this.router.navigate(['/project', this.projectKey, 'comparison', comparisonId]);
  }

  onComparisonDeleted(comparisonId: string): void {
    this.comparisons = this.comparisons.filter(c => c.id !== comparisonId);
    console.log(`Comparison ${comparisonId} deleted`);
  }

  onComparisonCreated(event: any): void {
    this.refreshProjectData();
  }

  onMappingViewed(mappingId: string): void {
    this.router.navigate(['/project', this.projectKey, 'mapping', mappingId]);
  }

  onMappingDeleted(event: { id: string; name: string }): void {
    this.mappings = this.mappings.filter(m => m.id !== event.id);
    console.log(`Mapping ${event.name} deleted`);
  }

  onMappingCreated(event: any): void {
    this.refreshProjectData();
  }

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

      this.hydrateCounts();
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


  // Hilfsfunktion: robustes Auslesen inkl. Fallbacks
  private valueFor<T extends object>(row: any, col: string): any {
    if (!row) return null;
    // Spezialfall: Packages anzeigen/sortieren nach displayName
    if (col === 'displayName') return (row.display ?? `${row.name}#${row.version}`) ?? '';
    return (row as any)[col];
  }

  // Zahlenerkennung: "49" -> 49, "09" -> 9, null -> NaN
  private toNumber(v: any): number {
    if (typeof v === 'number') return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  // Vergleicher mit Auto-Erkennung: wenn beide Werte numerisch sind -> numerisch
  private smartCompare(a: any, b: any): number {
    const na = this.toNumber(a);
    const nb = this.toNumber(b);
    const bothNumeric = Number.isFinite(na) && Number.isFinite(nb);

    if (bothNumeric) return na - nb;

    // Stringvergleich (localeCompare) mit Null-Handling
    const sa = (a ?? '').toString();
    const sb = (b ?? '').toString();
    return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
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

      this.hydrateCounts();
      console.log('Project data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing project data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Maps backend evaluation summary to frontend mapping counts
   * Uses simplified categories calculated by backend
   */
  private mapEvaluationSummaryToCounts(summary: any) {
    return {
      // Simplified categories from backend
      compatible: summary.simplified_compatible || 0,
      resolved: summary.simplified_resolved || 0,
      needs_action: summary.simplified_needs_action || 0,
      total: summary.total_fields || 0,

      // Legacy fields for compatibility (can be removed later)
      warning: summary.warnings || 0,
      incompatible: summary.incompatible || 0,
      mitigated: summary.action_mitigated || 0
    };
  }

  private hydrateCounts(): void {
    // Comparisons - Keep existing basic logic for now (no enhanced evaluation API yet)
    if (this.comparisons?.length) {
      const jobs = this.comparisons.map(c =>
        this.comparisonService.getComparisonData(this.projectKey, c.id).pipe(
          map(detail => ({ id: c.id, ...this.countFieldsByBasicClassification(detail?.fields ?? []) })),
          catchError(() => of({ id: c.id, warning: 0, incompatible: 0 }))
        )
      );
      forkJoin(jobs).subscribe(results => {
        const byId = new Map(results.map(r => [r.id, r]));
        this.comparisons = this.comparisons.map(c => {
          const r = byId.get(c.id);
          return { ...c, warningCount: r?.warning ?? 0, incompatibleCount: r?.incompatible ?? 0 };
        });

      });
    }

    // Mappings - Use backend evaluation summary API
    if (this.mappings?.length) {
      const jobs = this.mappings.map(m =>
        this.comparisonService.getMappingEvaluationSummary(this.projectKey, m.id).pipe(
          map(summary => ({ id: m.id, ...this.mapEvaluationSummaryToCounts(summary) })),
          catchError((error) => {
            console.warn(`Failed to load evaluation summary for mapping ${m.id}:`, error);
            // Fallback to loading mapping details and counting locally
            return this.mappingsService.getMapping(this.projectKey, m.id).pipe(
              map(detail => ({ id: m.id, ...this.countFieldsByBasicClassification(detail?.fields ?? []) })),
              catchError(() => of({
                id: m.id,
                warning: 0,
                incompatible: 0,
                compatible: 0,
                resolved: 0,
                mitigated: 0,
                needs_action: 0,
                total: 0
              }))
            );
          })
        )
      );
      forkJoin(jobs).subscribe(results => {
        const byId = new Map(results.map(r => [r.id, r]));
        this.mappings = this.mappings.map(m => {
          const r = byId.get(m.id);
          return {
            ...m,
            // Simplified categories from backend
            compatibleCount: r?.compatible ?? 0,
            resolvedCount: r?.resolved ?? 0,
            needsActionCount: r?.needs_action ?? 0,
            totalCount: r?.total ?? 0,

            // Legacy fields for compatibility (can be removed later)
            warningCount: r?.warning ?? 0,
            incompatibleCount: r?.incompatible ?? 0,
            mitigatedCount: r?.mitigated ?? 0
          };
        });
      });
    }
  }

  /**
   * Fallback method for basic field classification counting
   * Used when backend evaluation API is not available
   */
  private countFieldsByBasicClassification(fields: any[]) {
    let warning = 0, incompatible = 0, compatible = 0;

    for (const f of fields ?? []) {
      const cls = (f?.classification ?? '').toString().toLowerCase();
      switch (cls) {
        case 'compatible':
          compatible++;
          break;
        case 'warning':
          warning++;
          break;
        case 'incompatible':
          incompatible++;
          break;
      }
    }

    return {
      warning,
      incompatible,
      compatible,
      resolved: 0, // Backend evaluation required for these
      mitigated: 0,
      needs_action: 0,
      total: fields?.length ?? 0
    };
  }

  /**
   * Calculates overall project progress by aggregating all mapping statistics
   * Returns consolidated statistics across all mappings in the project
   */
  getProjectOverallSummary(): any {
    if (!this.mappings || this.mappings.length === 0) {
      return {
        total: 0,
        completed: 0,
        resolved: 0,
        needs_action: 0,
        totalMappings: 0
      };
    }

    const summary = {
      total: 0,
      completed: 0,
      resolved: 0,
      needs_action: 0,
      totalMappings: this.mappings.length
    };

    this.mappings.forEach(mapping => {
      // Use the enhanced evaluation counts if available, fallback to legacy counts
      summary.total += mapping.totalCount || 0;
      summary.completed += mapping.compatibleCount || 0;
      summary.resolved += mapping.resolvedCount || 0;
      summary.needs_action += mapping.needsActionCount || 0;
    });

    return summary;
  }

  /**
   * Calculates the overall project completion percentage
   * Considers both compatible and resolved fields as "completed"
   */
  getProjectCompletionPercentage(): number {
    const summary = this.getProjectOverallSummary();
    if (summary.total === 0) {
      return 0;
    }

    const completed = summary.completed + summary.resolved;
    return Math.round((completed / summary.total) * 100);
  }

  /**
   * Gets the percentage for a specific category in the progress bar
   * @param category The category to calculate percentage for ('completed', 'resolved', 'needs_action')
   */
  getProjectProgressPercentage(category: string): number {
    const summary = this.getProjectOverallSummary();
    if (summary.total === 0) {
      return 0;
    }

    const value = (summary as any)[category] || 0;
    return (value / summary.total) * 100;
  }

  /**
   * Gets a human-readable status description for the project
   */
  getProjectStatusDescription(): string {
    const summary = this.getProjectOverallSummary();
    const completionPercentage = this.getProjectCompletionPercentage();

    if (summary.total === 0) {
      return 'Keine Mappings im Projekt vorhanden';
    }

    if (completionPercentage >= 100) {
      return 'Alle Felder sind vollständig bearbeitet';
    } else if (completionPercentage >= 80) {
      return 'Projekt ist fast vollständig';
    } else if (completionPercentage >= 50) {
      return 'Projekt ist zur Hälfte bearbeitet';
    } else if (completionPercentage > 0) {
      return 'Projekt ist teilweise bearbeitet';
    } else {
      return 'Projekt noch nicht bearbeitet';
    }
  }

  /**
   * Gets the appropriate CSS class for the project progress status
   */
  getProjectStatusClass(): string {
    const completionPercentage = this.getProjectCompletionPercentage();

    if (completionPercentage >= 100) {
      return 'status-completed';
    } else if (completionPercentage >= 80) {
      return 'status-nearly-done';
    } else if (completionPercentage >= 50) {
      return 'status-half-done';
    } else if (completionPercentage > 0) {
      return 'status-in-progress';
    } else {
      return 'status-not-started';
    }
  }

  /**
   * Opens the manual entries import dialog
   * @param projectKey The key of the current project
   */
  openManualEntriesImportDialog(projectKey: string): void {
    this.dialog.open(ManualEntriesImportDialogComponent, {
      width: '600px',
      data: { projectKey }
    }).afterClosed().subscribe(result => {
      if (result) {
        console.log('Manual entries import completed:', result);
        // Optionally refresh project data after successful import
        this.refreshProjectData();
      }
    });
  }
}
