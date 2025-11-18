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
import { Package } from '../../models/package.model';
import { PackageUploadDialogComponent } from '../../package-upload-dialog/package-upload-dialog.component';
import { UpdatePackageNameDialogComponent } from '../../update-package-name-dialog/update-package-name-dialog.component';

type SortState = { col: string; dir: 'asc' | 'desc' };

@Component({
  selector: 'app-package-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIcon],
  template: `
    <h2 class="section-heading">List of Packages</h2>
    <table class="modern-table">
      <tr>
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
      <tr *ngFor="let package of packages">
        <td>
          <div *ngIf="package.display; else elseBlock">
            {{ package.display }} ({{ package.name }}#{{ package.version }})
          </div>
          <ng-template #elseBlock>
            {{ package.name }}#{{ package.version }}
          </ng-template>
        </td>
        <td>
          <button
            mat-icon-button
            (click)="editPackage(package)"
            class="mat-icon-button-sm"
          >
            <mat-icon>edit</mat-icon>
          </button>
          <button
            mat-icon-button
            (click)="deletePackage(package)"
            class="mat-icon-button-sm"
            title="Delete package"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </tr>
    </table>
  `,
  styleUrls: ['./package-list.component.css']
})
export class PackageListComponent {
  @Input() packages: Package[] = [];
  @Input() projectKey: string = '';

  @Output() packageDeleted = new EventEmitter<{ id: string; name: string }>();
  @Output() packageUpdated = new EventEmitter<Package>();

  sortState: SortState = { col: 'displayName', dir: 'asc' };

  constructor(private dialog: MatDialog) {}

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
}
