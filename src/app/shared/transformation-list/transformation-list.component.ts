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
import { Transformation } from '../../models/transformation.model';
import { AddTransformationDialogComponent } from '../../add-transformation-dialog/add-transformation-dialog.component';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { TransformationService } from '../../transformation.service';
import { MatSnackBar } from '@angular/material/snack-bar';

type SortState = { col: string; dir: 'asc' | 'desc' };

@Component({
  selector: 'app-transformation-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIcon, MatTooltipModule],
  template: `
    <h2 class="section-heading">List of Transformations</h2>
    <p class="section-description">
      Transformations definieren Bundle-zu-Struktur Mappings und bündeln mehrere Profile-zu-Profile Mappings.
    </p>

    <table class="modern-table" *ngIf="transformations.length > 0">
      <tr>
        <th class="col-wide clickable" (click)="sortTransformations('name')">
          Transformation Name
          <span *ngIf="sortState.col === 'name'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortTransformations('version')">
          Version
          <span *ngIf="sortState.col === 'version'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortTransformations('status')">
          Status
          <span *ngIf="sortState.col === 'status'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortTransformations('linked_mappings_count')">
          Linked Mappings
          <span *ngIf="sortState.col === 'linked_mappings_count'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortTransformations('last_updated')">
          Last Updated
          <span *ngIf="sortState.col === 'last_updated'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow">
          Action
          <button
            mat-icon-button
            (click)="openAddTransformationDialog()"
            title="Add new transformation"
            class="mat-icon-button-sm"
          >
            <mat-icon>add_box</mat-icon>
          </button>
        </th>
      </tr>

      <tr *ngFor="let transformation of transformations"
          class="hover-highlight clickable-row"
          (click)="viewTransformation(transformation.id)">
        <td>
          <div class="transformation-name">{{ transformation.name }}</div>
          <div class="transformation-profiles" *ngIf="transformation.sources && transformation.sources.length">
            <span class="profile-badge source" *ngFor="let source of transformation.sources">
              {{ source.name || source.url }}
            </span>
            <mat-icon class="arrow-icon">arrow_forward</mat-icon>
            <span class="profile-badge target">
              {{ transformation.target.name || transformation.target.url }}
            </span>
          </div>
        </td>
        <td class="center-text">
          <span class="version-badge">{{ transformation.version }}</span>
        </td>
        <td class="center-text">
          <span class="status-badge" [ngClass]="'status-' + transformation.status">
            {{ transformation.status }}
          </span>
        </td>
        <td class="center-text">
          <span class="pill pill--total">{{ transformation.linked_mappings_count ?? 0 }}</span>
        </td>
        <td class="center-text">
          {{ formatDate(transformation.last_updated) }}
        </td>
        <td (click)="$event.stopPropagation()">
          <button
            mat-icon-button
            (click)="deleteTransformation(transformation)"
            class="mat-icon-button-sm"
            title="Delete transformation"
            matTooltip="Transformation löschen"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </tr>
    </table>

    <!-- Empty state -->
    <div class="empty-state" *ngIf="transformations.length === 0">
      <mat-icon class="empty-icon">transform</mat-icon>
      <h3>Keine Transformations vorhanden</h3>
      <p>Erstellen Sie eine neue Transformation, um Bundle-zu-Struktur Mappings zu definieren.</p>
      <button mat-raised-button color="primary" (click)="openAddTransformationDialog()">
        <mat-icon>add</mat-icon>
        Transformation erstellen
      </button>
    </div>
  `,
  styleUrls: ['./transformation-list.component.css']
})
export class TransformationListComponent {
  @Input() transformations: Transformation[] = [];
  @Input() projectKey: string = '';

  @Output() transformationViewed = new EventEmitter<string>();
  @Output() transformationDeleted = new EventEmitter<{ id: string; name: string }>();
  @Output() transformationCreated = new EventEmitter<any>();

  sortState: SortState = { col: 'name', dir: 'asc' };

  constructor(
    private dialog: MatDialog,
    private transformationService: TransformationService,
    private snackBar: MatSnackBar
  ) {}

  sortTransformations(column: string): void {
    this.sortState = {
      col: column,
      dir: (this.sortState.col === column && this.sortState.dir === 'asc') ? 'desc' : 'asc'
    };

    this.transformations.sort((a, b) => {
      const valueA = this.getValue(a, column);
      const valueB = this.getValue(b, column);

      let comparison: number;
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        comparison = valueA.localeCompare(valueB);
      } else {
        comparison = (valueA as number) - (valueB as number);
      }

      return this.sortState.dir === 'asc' ? comparison : -comparison;
    });
  }

  private getValue(transformation: any, column: string): string | number {
    switch (column) {
      case 'name':
        return transformation.name || '';
      case 'version':
        return transformation.version || '';
      case 'status':
        return transformation.status || '';
      case 'linked_mappings_count':
        return transformation.linked_mappings_count ?? 0;
      case 'last_updated':
        return transformation.last_updated || '';
      default:
        return '';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  openAddTransformationDialog(): void {
    const dialogRef = this.dialog.open(AddTransformationDialogComponent, {
      width: '700px',
      data: { projectKey: this.projectKey }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.transformationCreated.emit(result);
      }
    });
  }

  viewTransformation(transformationId: string): void {
    this.transformationViewed.emit(transformationId);
  }

  deleteTransformation(transformation: Transformation): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Transformation löschen',
        message: `Möchten Sie die Transformation "${transformation.name}" wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.transformationService.deleteTransformation(this.projectKey, transformation.id)
          .subscribe({
            next: () => {
              this.snackBar.open('Transformation erfolgreich gelöscht', 'OK', { duration: 3000 });
              this.transformationDeleted.emit({ id: transformation.id, name: transformation.name });
            },
            error: (err) => {
              this.snackBar.open('Fehler beim Löschen der Transformation', 'OK', { duration: 5000 });
              console.error('Error deleting transformation:', err);
            }
          });
      }
    });
  }
}
