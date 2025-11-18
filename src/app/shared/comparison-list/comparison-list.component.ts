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
import { Comparison } from '../../models/comparison.model';
import { AddComparisonDialogComponent } from '../../add-comparison-dialog/add-comparison-dialog.component';

type SortState = { col: string; dir: 'asc' | 'desc' };

@Component({
  selector: 'app-comparison-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIcon],
  template: `
    <h2 class="section-heading">List of Comparisons</h2>
    <table class="modern-table">
      <tr>
        <th class="col-wide clickable" (click)="sortComparisons('name')">
          Comparison
          <span *ngIf="sortState.col === 'name'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortComparisons('warningCount')">
          Warnings
          <span *ngIf="sortState.col === 'warningCount'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortComparisons('incompatibleCount')">
          Incompatible
          <span *ngIf="sortState.col === 'incompatibleCount'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow">
          Action
          <button
            mat-icon-button
            (click)="openAddComparisonDialog()"
            title="Add new comparison"
            class="mat-icon-button-sm"
          >
            <mat-icon>add-box</mat-icon>
          </button>
        </th>
      </tr>

      <tr *ngFor="let comparison of comparisons" class="hover-highlight">
        <td class="clickable-cell" (click)="viewComparison(comparison.id)">
          {{ comparison.name }}
        </td>
        <td>
          <span class="pill pill--warning">{{ comparison.warningCount ?? 0 }}</span>
        </td>
        <td>
          <span class="pill pill--incompatible">{{ comparison.incompatibleCount ?? 0 }}</span>
        </td>
        <td>
          <button
            mat-icon-button
            (click)="viewComparison(comparison.id)"
            class="mat-icon-button-sm"
            title="View comparison"
          >
            <mat-icon>remove_red_eye</mat-icon>
          </button>
          <button
            mat-icon-button
            (click)="deleteComparison(comparison.id)"
            class="mat-icon-button-sm"
            title="Delete comparison"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </tr>
    </table>
  `,
  styleUrls: ['./comparison-list.component.css']
})
export class ComparisonListComponent {
  @Input() comparisons: Comparison[] = [];
  @Input() projectKey: string = '';

  @Output() comparisonViewed = new EventEmitter<string>();
  @Output() comparisonDeleted = new EventEmitter<string>();
  @Output() comparisonCreated = new EventEmitter<any>();

  sortState: SortState = { col: 'name', dir: 'asc' };

  constructor(private dialog: MatDialog) {}

  sortComparisons(column: 'name' | 'warningCount' | 'incompatibleCount'): void {
    this.sortState = {
      col: column,
      dir: (this.sortState.col === column && this.sortState.dir === 'asc') ? 'desc' : 'asc'
    };

    this.comparisons.sort((a, b) => {
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

  private getValue(comparison: any, column: string): string | number {
    switch (column) {
      case 'name':
        return comparison.name || '';
      case 'warningCount':
        return comparison.warningCount ?? 0;
      case 'incompatibleCount':
        return comparison.incompatibleCount ?? 0;
      default:
        return '';
    }
  }

  openAddComparisonDialog(): void {
    const dialogRef = this.dialog.open(AddComparisonDialogComponent, {
      width: '600px',
      data: { projectKey: this.projectKey }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.comparisonCreated.emit(result);
      }
    });
  }

  viewComparison(comparisonId: string): void {
    this.comparisonViewed.emit(comparisonId);
  }

  deleteComparison(comparisonId: string): void {
    this.comparisonDeleted.emit(comparisonId);
  }
}
