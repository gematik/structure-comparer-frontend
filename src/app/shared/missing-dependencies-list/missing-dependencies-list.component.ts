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

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ProjectService } from '../../project.service';
import {
  DependencyAnalysisResult,
  MissingDependency,
  PackageDownloadRequest,
  PackageDownloadResult,
  BatchDownloadResult
} from '../../models/package-dependency.model';

/**
 * Component that displays missing package dependencies in a table format.
 * Integrated into the package list view to show which packages are required but not loaded.
 */
@Component({
  selector: 'app-missing-dependencies-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './missing-dependencies-list.component.html',
  styleUrls: ['./missing-dependencies-list.component.css']
})
export class MissingDependenciesListComponent implements OnInit, OnChanges {
  /** Project key to analyze dependencies for */
  @Input() projectKey: string = '';

  /** Event emitted when project should be reloaded after package download */
  @Output() projectReload = new EventEmitter<void>();

  /** Loading state */
  isLoading = false;

  /** Download in progress state */
  isDownloading = false;

  /** Track which packages are being downloaded */
  downloadingPackages: Set<string> = new Set();

  /** Analysis result from backend */
  analysisResult: DependencyAnalysisResult | null = null;

  /** Error message if analysis failed */
  errorMessage: string | null = null;

  constructor(
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.projectKey) {
      this.loadDependencyAnalysis();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectKey'] && !changes['projectKey'].firstChange) {
      this.loadDependencyAnalysis();
    }
  }

  /**
   * Load dependency analysis from the backend
   */
  loadDependencyAnalysis(): void {
    if (!this.projectKey) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.projectService.analyzeDependencies(this.projectKey).subscribe({
      next: (result) => {
        this.analysisResult = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error analyzing dependencies:', error);
        this.errorMessage = 'Fehler beim Analysieren der Abhängigkeiten';
        this.isLoading = false;
      }
    });
  }

  /**
   * Check if there are any missing dependencies to display
   */
  get hasMissingDependencies(): boolean {
    return this.missingDependencies.length > 0;
  }

  /**
   * Get missing dependencies, sorted by direct first, then transitive
   */
  get missingDependencies(): MissingDependency[] {
    if (!this.analysisResult) {
      return [];
    }
    // Sort: direct dependencies first, then by package key
    return [...this.analysisResult.missing_dependencies].sort((a, b) => {
      if (a.is_direct_dependency !== b.is_direct_dependency) {
        return a.is_direct_dependency ? -1 : 1;
      }
      return a.package_key.localeCompare(b.package_key);
    });
  }

  /**
   * Get count of direct missing dependencies
   */
  get directMissingCount(): number {
    return this.missingDependencies.filter(d => d.is_direct_dependency).length;
  }

  /**
   * Get count of transitive missing dependencies
   */
  get transitiveMissingCount(): number {
    return this.missingDependencies.filter(d => !d.is_direct_dependency).length;
  }

  /**
   * Format the required_by list for display
   */
  formatRequiredBy(requiredBy: string[]): string {
    if (requiredBy.length <= 2) {
      return requiredBy.join(', ');
    }
    return `${requiredBy.slice(0, 2).join(', ')} und ${requiredBy.length - 2} weitere`;
  }

  /**
   * Get full required_by list for tooltip
   */
  getRequiredByTooltip(requiredBy: string[]): string {
    return `Benötigt von:\n${requiredBy.join('\n')}`;
  }

  /**
   * Parse a package key into name and version
   */
  private parsePackageKey(packageKey: string): { name: string; version: string } | null {
    const parts = packageKey.split('#');
    if (parts.length !== 2) {
      return null;
    }
    return { name: parts[0], version: parts[1] };
  }

  /**
   * Download a single missing package from FHIR registry
   */
  downloadPackage(dependency: MissingDependency): void {
    const parsed = this.parsePackageKey(dependency.package_key);
    if (!parsed) {
      this.snackBar.open('Ungültiges Package-Format', 'OK', { duration: 3000 });
      return;
    }

    this.downloadingPackages.add(dependency.package_key);

    this.projectService.downloadPackage(this.projectKey, parsed.name, parsed.version).subscribe({
      next: (result: PackageDownloadResult) => {
        this.downloadingPackages.delete(dependency.package_key);
        if (result.success) {
          this.snackBar.open(
            `Package ${dependency.package_key} erfolgreich heruntergeladen von ${result.registry_url}`,
            'OK',
            { duration: 5000 }
          );
          // Reload project from disk on server side, then refresh analysis
          this.projectService.reloadProjectFromDisk(this.projectKey).subscribe({
            next: () => {
              this.projectReload.emit();
              this.loadDependencyAnalysis();
            },
            error: () => {
              // Even if reload fails, try to refresh analysis
              this.projectReload.emit();
              this.loadDependencyAnalysis();
            }
          });
        } else {
          this.snackBar.open(`Fehler: ${result.message}`, 'OK', { duration: 5000 });
        }
      },
      error: (error) => {
        this.downloadingPackages.delete(dependency.package_key);
        console.error('Download error:', error);
        this.snackBar.open('Fehler beim Herunterladen des Packages', 'OK', { duration: 5000 });
      }
    });
  }

  /**
   * Download all missing packages from FHIR registries
   */
  downloadAllMissing(): void {
    if (this.missingDependencies.length === 0) {
      return;
    }

    const packages: PackageDownloadRequest[] = [];
    for (const dep of this.missingDependencies) {
      const parsed = this.parsePackageKey(dep.package_key);
      if (parsed) {
        packages.push({ package_name: parsed.name, version: parsed.version });
        this.downloadingPackages.add(dep.package_key);
      }
    }

    if (packages.length === 0) {
      return;
    }

    this.isDownloading = true;

    this.projectService.downloadPackages(this.projectKey, packages).subscribe({
      next: (result: BatchDownloadResult) => {
        this.isDownloading = false;
        this.downloadingPackages.clear();

        const message = `${result.successful} von ${result.total_requested} Packages heruntergeladen`;
        this.snackBar.open(message, 'OK', { duration: 5000 });

        if (result.successful > 0) {
          // Reload project from disk on server side, then refresh analysis
          this.projectService.reloadProjectFromDisk(this.projectKey).subscribe({
            next: () => {
              this.projectReload.emit();
              this.loadDependencyAnalysis();
            },
            error: () => {
              // Even if reload fails, try to refresh analysis
              this.projectReload.emit();
              this.loadDependencyAnalysis();
            }
          });
        }

        // Show failed downloads if any
        if (result.failed > 0) {
          const failedPackages = result.results
            .filter(r => !r.success)
            .map(r => r.package_key)
            .join(', ');
          console.error('Failed downloads:', failedPackages);
        }
      },
      error: (error) => {
        this.isDownloading = false;
        this.downloadingPackages.clear();
        console.error('Batch download error:', error);
        this.snackBar.open('Fehler beim Herunterladen der Packages', 'OK', { duration: 5000 });
      }
    });
  }

  /**
   * Check if a specific package is being downloaded
   */
  isPackageDownloading(packageKey: string): boolean {
    return this.downloadingPackages.has(packageKey);
  }

  /**
   * Check if any download operation is in progress
   */
  get isAnyDownloadInProgress(): boolean {
    return this.isDownloading || this.downloadingPackages.size > 0;
  }

  /**
   * Refresh the dependency analysis
   */
  refresh(): void {
    this.loadDependencyAnalysis();
  }

  /**
   * Refresh the dependency analysis with server-side project reload.
   * This ensures file system changes are reflected.
   */
  refreshAnalysis(): void {
    this.isLoading = true;
    this.projectService.reloadProjectFromDisk(this.projectKey).subscribe({
      next: () => {
        this.loadDependencyAnalysis();
      },
      error: () => {
        // Even if reload fails, try to load analysis
        this.loadDependencyAnalysis();
      }
    });
  }
}
