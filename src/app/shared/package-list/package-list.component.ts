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
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Package, PackageStatus } from '../../models/package.model';
import { PackageUploadDialogComponent } from '../../package-upload-dialog/package-upload-dialog.component';
import { UpdatePackageNameDialogComponent } from '../../update-package-name-dialog/update-package-name-dialog.component';
import { MissingDependenciesListComponent } from '../missing-dependencies-list/missing-dependencies-list.component';
import { ProjectService } from '../../project.service';
import { PackageDownloadResult } from '../../models/package-dependency.model';

type SortState = { col: string; dir: 'asc' | 'desc' };

@Component({
  selector: 'app-package-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIcon,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MissingDependenciesListComponent
  ],
  template: `
    <h2 class="section-heading">List of Packages</h2>

    <!-- Status Summary -->
    <div class="package-status-summary" *ngIf="hasMissingOrOrphaned()">
      <span class="status-badge status-available">{{ getAvailableCount() }} verfügbar</span>
      <span class="status-badge status-missing" *ngIf="getMissingCount() > 0">
        ⚠️ {{ getMissingCount() }} fehlt
      </span>
      <span class="status-badge status-orphaned" *ngIf="getOrphanedCount() > 0">
        {{ getOrphanedCount() }} verwaist
      </span>
    </div>

    <!-- Warning Banner for Missing Packages -->
    <div class="missing-packages-warning" *ngIf="getMissingCount() > 0">
      <mat-icon class="warning-icon">warning</mat-icon>
      <span>{{ getMissingCount() }} Package(s) müssen noch heruntergeladen werden!</span>
      <button mat-raised-button color="primary" (click)="downloadAllMissing()" [disabled]="isDownloading">
        <mat-icon *ngIf="!isDownloading">cloud_download</mat-icon>
        <mat-spinner *ngIf="isDownloading" diameter="20"></mat-spinner>
        Alle herunterladen
      </button>
    </div>

    <table class="modern-table">
      <tr>
        <th class="col-status">Status</th>
        <th class="col-wide clickable" (click)="sortPackages('displayName')">
          Package Name
          <span *ngIf="sortState.col === 'displayName'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow">
          Action
          <button
            mat-icon-button
            (click)="openPackageUploadDialog()"
            title="Add new package"
            class="mat-icon-button-sm"
          >
            <mat-icon>add-box</mat-icon>
          </button>
        </th>
      </tr>
      <tr *ngFor="let package of packages" [class.row-missing]="package.status === 'missing'" [class.row-orphaned]="package.status === 'orphaned'">
        <td class="status-cell">
          <span [ngSwitch]="package.status">
            <span *ngSwitchCase="'available'" class="status-indicator status-available" matTooltip="Verfügbar">🟢</span>
            <span *ngSwitchCase="'missing'" class="status-indicator status-missing" matTooltip="Nicht heruntergeladen">🟡</span>
            <span *ngSwitchCase="'orphaned'" class="status-indicator status-orphaned" matTooltip="Verwaist (nicht in Config)">⚪</span>
            <span *ngSwitchDefault class="status-indicator status-available" matTooltip="Verfügbar">🟢</span>
          </span>
        </td>
        <td>
          <div *ngIf="package.display; else elseBlock">
            {{ package.display }} ({{ package.name }}#{{ package.version }})
          </div>
          <ng-template #elseBlock>
            {{ package.name }}#{{ package.version }}
          </ng-template>
        </td>
        <td>
          <!-- Download button for missing packages -->
          <button
            *ngIf="package.status === 'missing'"
            mat-icon-button
            (click)="downloadPackage(package)"
            [disabled]="downloadingPackages.has(package.id)"
            class="mat-icon-button-sm"
            matTooltip="Package herunterladen"
          >
            <mat-icon *ngIf="!downloadingPackages.has(package.id)">cloud_download</mat-icon>
            <mat-spinner *ngIf="downloadingPackages.has(package.id)" diameter="18"></mat-spinner>
          </button>

          <!-- Edit button (only for available packages) -->
          <button
            *ngIf="package.status !== 'missing'"
            mat-icon-button
            (click)="editPackage(package)"
            class="mat-icon-button-sm"
            matTooltip="Bearbeiten"
          >
            <mat-icon>edit</mat-icon>
          </button>

          <!-- Delete button -->
          <button
            mat-icon-button
            (click)="deletePackage(package)"
            class="mat-icon-button-sm"
            [matTooltip]="package.status === 'orphaned' ? 'Dateien löschen' : 'Löschen'"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </tr>
    </table>

    <!-- Missing Dependencies Section -->
    <app-missing-dependencies-list
      [projectKey]="projectKey"
      (projectReload)="onProjectReload()"
    ></app-missing-dependencies-list>
  `,
  styleUrls: ['./package-list.component.css']
})
export class PackageListComponent {
  @Input() packages: Package[] = [];
  @Input() projectKey: string = '';

  @Output() packageDeleted = new EventEmitter<{ id: string; name: string }>();
  @Output() packageUpdated = new EventEmitter<Package>();
  @Output() projectReloadRequested = new EventEmitter<void>();

  sortState: SortState = { col: 'displayName', dir: 'asc' };
  downloadingPackages = new Set<string>();
  isDownloading = false;

  constructor(
    private dialog: MatDialog,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  // ============================================================================
  // Status Count Methods
  // ============================================================================

  hasMissingOrOrphaned(): boolean {
    return this.getMissingCount() > 0 || this.getOrphanedCount() > 0;
  }

  getAvailableCount(): number {
    return this.packages.filter(p => p.status === 'available' || !p.status).length;
  }

  getMissingCount(): number {
    return this.packages.filter(p => p.status === 'missing').length;
  }

  getOrphanedCount(): number {
    return this.packages.filter(p => p.status === 'orphaned').length;
  }

  // ============================================================================
  // Download Methods
  // ============================================================================

  downloadPackage(pkg: Package): void {
    this.downloadingPackages.add(pkg.id);

    this.projectService.downloadPackage(this.projectKey, pkg.name, pkg.version).subscribe({
      next: (result: PackageDownloadResult) => {
        this.downloadingPackages.delete(pkg.id);
        if (result.success) {
          this.snackBar.open(`Package ${pkg.name}#${pkg.version} erfolgreich heruntergeladen`, 'OK', { duration: 3000 });
          this.projectReloadRequested.emit();
        } else {
          this.snackBar.open(`Fehler: ${result.message}`, 'OK', { duration: 5000 });
        }
      },
      error: (err) => {
        this.downloadingPackages.delete(pkg.id);
        this.snackBar.open(`Fehler beim Herunterladen: ${err}`, 'OK', { duration: 5000 });
      }
    });
  }

  downloadAllMissing(): void {
    const missingPackages = this.packages.filter(p => p.status === 'missing');
    if (missingPackages.length === 0) return;

    this.isDownloading = true;
    const requests = missingPackages.map(pkg => ({
      package_name: pkg.name,
      version: pkg.version
    }));

    this.projectService.downloadPackages(this.projectKey, requests).subscribe({
      next: (result) => {
        this.isDownloading = false;
        const message = `${result.successful} von ${result.total_requested} Packages heruntergeladen`;
        this.snackBar.open(message, 'OK', { duration: 5000 });
        if (result.successful > 0) {
          this.projectReloadRequested.emit();
        }
      },
      error: (err) => {
        this.isDownloading = false;
        this.snackBar.open(`Fehler: ${err}`, 'OK', { duration: 5000 });
      }
    });
  }

  // ============================================================================
  // Sort Methods
  // ============================================================================

  sortPackages(column: string): void {
    this.sortState = {
      col: column,
      dir: (this.sortState.col === column && this.sortState.dir === 'asc') ? 'desc' : 'asc'
    };

    this.packages.sort((a, b) => {
      const valueA = this.getPackageDisplayName(a);
      const valueB = this.getPackageDisplayName(b);
      const comparison = valueA.localeCompare(valueB);
      return this.sortState.dir === 'asc' ? comparison : -comparison;
    });
  }

  private getPackageDisplayName(pkg: Package): string {
    return pkg.display ?? `${pkg.name}#${pkg.version}`;
  }

  openPackageUploadDialog(): void {
    const dialogRef = this.dialog.open(PackageUploadDialogComponent, {
      width: '400px',
      data: { projectKey: this.projectKey }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.packageUpdated.emit(result);
      }
    });
  }

  editPackage(pkg: Package): void {
    const dialogRef = this.dialog.open(UpdatePackageNameDialogComponent, {
      width: '400px',
      data: {
        currentName: pkg.display,
        projectKey: this.projectKey,
        packageId: pkg.id
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== null) {
        this.packageUpdated.emit({ ...pkg, display: result });
      }
    });
  }

  deletePackage(pkg: Package): void {
    this.packageDeleted.emit({
      id: pkg.id,
      name: pkg.display || pkg.name
    });
  }

  /**
   * Called when packages are downloaded and project needs to be reloaded
   */
  onProjectReload(): void {
    this.projectReloadRequested.emit();
  }
}
