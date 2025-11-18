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
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { PackageUploadDialogComponent } from '../package-upload-dialog/package-upload-dialog.component';
import { UpdatePackageNameDialogComponent } from '../update-package-name-dialog/update-package-name-dialog.component';
import { AddMappingDialogComponent } from '../add-mapping-dialog/add-mapping-dialog.component';
import { PackageService } from '../package.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';
import { ImportManualEntriesResponse } from '../models/manual-entries-import.model';

type SortDir = 'asc' | 'desc';
interface SortState { col: string; dir: SortDir; }



@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    MatButtonModule,
    MatIcon,
    MatProgressSpinnerModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatListModule,
    MatDividerModule,
    MatChipsModule
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

  // Manual entries import properties
  selectedImportFile: File | null = null;
  isImportingManualEntries = false;
  importResult: ImportManualEntriesResponse | null = null;
  importError: string | null = null;

  // FontAwesome icons for UI elements
  faEdit = faEdit;   // Icon für den Edit-Button
  faPlus = faPlus;   // Icon für den Plus-Button
  faTrash = faTrash; // Icon für den Delete-Button

  // Sorting
  sort = {
    comparisons: { column: 'name', direction: 'asc' as 'asc' | 'desc' },
    mappings: { column: 'name', direction: 'asc' as 'asc' | 'desc' }
  };

  compSort: SortState = { col: 'name', dir: 'asc' };
  mapSort: SortState = { col: 'name', dir: 'asc' };
  pkgSort: SortState = { col: 'displayName', dir: 'asc' };



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
      this.sortComparisonsBy('name');
      this.sortMappingsBy('name');
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

  // Allgemeine Sortierfunktion (stabil genug für unsere Arrays)
  private sortInPlace<T extends object>(rows: T[], col: string, dir: SortDir): void {
    rows.sort((r1: any, r2: any) => {
      const v1 = this.valueFor(r1, col);
      const v2 = this.valueFor(r2, col);
      const cmp = this.smartCompare(v1, v2);
      return dir === 'asc' ? cmp : -cmp;
    });
  }

  // Öffentliche Handler für Klick auf Header
  sortComparisonsBy(column: string): void {
    this.sort.comparisons.column = column;
    this.sort.comparisons.direction = this.sort.comparisons.direction === 'asc' ? 'desc' : 'asc';
    this.sortInPlace(this.comparisons, column, this.sort.comparisons.direction);
  }

  sortMappingsBy(column: string): void {
    this.sort.mappings.column = column;
    this.sort.mappings.direction = this.sort.mappings.direction === 'asc' ? 'desc' : 'asc';
    this.sortInPlace(this.mappings, column, this.sort.mappings.direction);
  }

  sortComparisons(col: 'name' | 'warningCount' | 'incompatibleCount'): void {
    this.compSort = {
      col,
      dir: (this.compSort.col === col && this.compSort.dir === 'asc') ? 'desc' : 'asc'
    };
    this.sortInPlace(this.comparisons, this.compSort.col, this.compSort.dir);
  }

  sortMappings(col: 'name' | 'totalCount' | 'compatibleCount' | 'resolvedCount' | 'needsActionCount'): void {
    this.mapSort = {
      col,
      dir: (this.mapSort.col === col && this.mapSort.dir === 'asc') ? 'desc' : 'asc'
    };
    this.sortInPlace(this.mappings, this.mapSort.col, this.mapSort.dir);
  }

  sortPackages(col: 'displayName'): void {
    this.pkgSort = {
      col,
      dir: (this.pkgSort.col === col && this.pkgSort.dir === 'asc') ? 'desc' : 'asc'
    };
    this.sortInPlace(this.packages, this.pkgSort.col, this.pkgSort.dir);
  }

  sortMappings(col: 'name' | 'compatibleCount' | 'resolvedCount' | 'needsActionCount' | 'totalCount'): void {
    this.mapSort = {
      col,
      dir: (this.mapSort.col === col && this.mapSort.dir === 'asc') ? 'desc' : 'asc'
    };
    this.sortInPlace(this.mappings, this.mapSort.col, this.mapSort.dir);
  }

  sortPackages(col: 'displayName'): void {
    this.pkgSort = {
      col,
      dir: (this.pkgSort.col === col && this.pkgSort.dir === 'asc') ? 'desc' : 'asc'
    };
    this.sortInPlace(this.packages, this.pkgSort.col, this.pkgSort.dir);
  }

  // Nach jedem Laden/Refresh aktuelle Sortierung erneut anwenden
  private applyActiveSorts(): void {
    this.sortInPlace(this.comparisons, this.compSort.col, this.compSort.dir);
    this.sortInPlace(this.mappings, this.mapSort.col, this.mapSort.dir);
    this.sortInPlace(this.packages, this.pkgSort.col, this.pkgSort.dir);
  }

  private sortData<T>(data: T[], column: keyof T, direction: 'asc' | 'desc'): T[] {
    return [...data].sort((a: any, b: any) => {
      const A = (a[column] ?? '').toString().toLowerCase();
      const B = (b[column] ?? '').toString().toLowerCase();
      return direction === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
    });
  }

  sortComparisonsBy(column: keyof Comparison) {
    const s = this.sort.comparisons;
    s.direction = (s.column === column && s.direction === 'asc') ? 'desc' : 'asc';
    s.column = column;
    this.comparisons = this.sortData(this.comparisons, column, s.direction);
  }

  sortMappingsBy(column: keyof Mapping) {
    const s = this.sort.mappings;
    s.direction = (s.column === column && s.direction === 'asc') ? 'desc' : 'asc';
    s.column = column;
    this.mappings = this.sortData(this.mappings, column, s.direction);
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

      this.hydrateCounts();
      this.sortComparisonsBy('name');
      this.sortMappingsBy('name');
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
        // Nach Hydrierung sortieren:
        this.sortInPlace(this.comparisons, this.compSort.col, this.compSort.dir);
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
        this.sortInPlace(this.mappings, this.mapSort.col, this.mapSort.dir);
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
   * Handles file selection for manual entries import
   * Validates file type and clears previous errors/results
   * @param event The file input change event
   */
  onManualEntriesFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.selectedImportFile = null;
      return;
    }

    const file = input.files[0];

    // Validate file type
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.yaml') && !lowerName.endsWith('.yml')) {
      this.importError = 'Bitte wählen Sie eine YAML-Datei (.yaml oder .yml) aus.';
      this.selectedImportFile = null;
      return;
    }

    // Clear previous state
    this.importError = null;
    this.importResult = null;
    this.selectedImportFile = file;
  }

  /**
   * Initiates the manual entries import process
   * Calls the ProjectService to import and migrate legacy manual_entries.yaml files
   */
  onImportManualEntries(): void {
    if (!this.selectedImportFile) {
      return;
    }

    if (!this.projectKey) {
      this.importError = 'Projekt-Schlüssel ist nicht verfügbar.';
      return;
    }

    this.isImportingManualEntries = true;
    this.importError = null;
    this.importResult = null;

    this.projectService.importManualEntries(this.projectKey, this.selectedImportFile)
      .pipe(finalize(() => {
        this.isImportingManualEntries = false;
      }))
      .subscribe({
        next: (response: ImportManualEntriesResponse) => {
          this.importResult = response;
          if (!this.projectService.isImportSuccessful(response)) {
            this.importError = response.message || 'Import fehlgeschlagen.';
          } else {
            // Clear file selection after successful import
            this.selectedImportFile = null;
            // Reset file input
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) {
              fileInput.value = '';
            }
          }
        },
        error: (error) => {
          this.importError = this.extractImportErrorMessage(error);
        }
      });
  }

  /**
   * Checks if the manual entries import was successful
   * @param result The import result to check
   * @returns True if the import was successful, false otherwise
   */
  isImportSuccessful(result: ImportManualEntriesResponse | null): boolean {
    return result?.status === 'ok';
  }

  /**
   * Extracts a user-friendly error message from HTTP error responses
   * @param error The error object from HTTP request
   * @returns A formatted error message string
   */
  private extractImportErrorMessage(error: any): string {
    if (error?.error?.error) {
      return error.error.error;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Beim Import ist ein unbekannter Fehler aufgetreten.';
  }

  // Package management methods
  editPackage(displayName: string, projectKey: string, packageId: string): void {
    // TODO: Implement package editing
    console.log('Edit package:', displayName, projectKey, packageId);
  }

  deletePackageWithConfirm(packageId: string, displayName: string): void {
    // TODO: Implement package deletion with confirmation
    console.log('Delete package:', packageId, displayName);
  }

  openPackageUploadDialog(projectKey: string): void {
    // TODO: Implement package upload dialog
    console.log('Open package upload dialog for project:', projectKey);
  }

  // Comparison management methods
  addComparison(): void {
    // TODO: Implement add comparison
    console.log('Add comparison');
  }

  editComparison(comparisonId: string): void {
    // TODO: Implement edit comparison
    console.log('Edit comparison:', comparisonId);
  }

  deleteComparison(comparisonId: string): void {
    // TODO: Implement delete comparison
    console.log('Delete comparison:', comparisonId);
  }

  // Mapping management methods
  addMapping(): void {
    // TODO: Implement add mapping
    console.log('Add mapping');
  }

  editMapping(mappingId: string): void {
    // TODO: Implement edit mapping
    console.log('Edit mapping:', mappingId);
  }

  deleteMapping(mappingId: string): void {
    // TODO: Implement delete mapping
    console.log('Delete mapping:', mappingId);
  }

  // Navigation methods
  navigateToComparison(comparisonId: string): void {
    this.router.navigate(['/comparison', this.projectKey, comparisonId]);
  }

  navigateToMapping(mappingId: string): void {
    this.router.navigate(['/mapping', this.projectKey, mappingId]);
  }
}
