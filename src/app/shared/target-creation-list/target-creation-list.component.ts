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
 * Target Creation List Component - Phase 8.1 Implementation
 *
 * Displays a list of Target Creations in a table format with sorting capabilities.
 * Similar to MappingListComponent but adapted for Target Creation specifics:
 * - No source profiles (only target)
 * - Different status counts (action_required, resolved, optional_pending)
 * - Simplified actions (manual, fixed only)
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { TargetCreationListItem } from '../../models/target-creation.model';

type SortState = { col: string; dir: 'asc' | 'desc' };

@Component({
  selector: 'app-target-creation-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIcon],
  template: `
    <h2 class="section-heading">List of Target Creations</h2>
    <table class="modern-table">
      <tr>
        <th class="col-id clickable" (click)="sortTargetCreations('id')">
          ID
          <span *ngIf="sortState.col === 'id'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-wide clickable" (click)="sortTargetCreations('name')">
          Name
          <span *ngIf="sortState.col === 'name'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-version clickable" (click)="sortTargetCreations('version')">
          Version
          <span *ngIf="sortState.col === 'version'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-status clickable" (click)="sortTargetCreations('status')">
          Status
          <span *ngIf="sortState.col === 'status'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-wide clickable" (click)="sortTargetCreations('target')">
          Target Profile
          <span *ngIf="sortState.col === 'target'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortTargetCreations('total')">
          Total
          <span *ngIf="sortState.col === 'total'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortTargetCreations('action_required')">
          Required
          <span *ngIf="sortState.col === 'action_required'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortTargetCreations('resolved')">
          Resolved
          <span *ngIf="sortState.col === 'resolved'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortTargetCreations('optional_pending')">
          Optional
          <span *ngIf="sortState.col === 'optional_pending'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow">
          Action
          <button
            mat-icon-button
            (click)="openAddTargetCreationDialog()"
            title="Add new target creation"
            class="mat-icon-button-sm"
          >
            <mat-icon>add-box</mat-icon>
          </button>
        </th>
      </tr>

      <tr *ngFor="let targetCreation of targetCreations" class="hover-highlight clickable-row" (click)="viewTargetCreation(targetCreation.id)">
        <td class="text-mono">
          {{ targetCreation.id.substring(0, 8) }}...
        </td>
        <td>
          {{ targetCreation.name }}
        </td>
        <td>
          {{ targetCreation.version }}
        </td>
        <td>
          <span class="badge" [ngClass]="'badge--' + targetCreation.status">
            {{ targetCreation.status }}
          </span>
        </td>
        <td>
          <div class="profile-info">
            <span class="profile-name">{{ targetCreation.target.name }}</span>
            <span class="profile-version">v{{ targetCreation.target.version }}</span>
          </div>
        </td>
        <td>
          <span class="pill pill--total">{{ targetCreation.status_counts.total }}</span>
        </td>
        <td>
          <span class="pill pill--action-required">{{ targetCreation.status_counts.action_required }}</span>
        </td>
        <td>
          <span class="pill pill--resolved">{{ targetCreation.status_counts.resolved }}</span>
        </td>
        <td>
          <span class="pill pill--optional">{{ targetCreation.status_counts.optional_pending }}</span>
        </td>
        <td (click)="$event.stopPropagation()">
          <button
            mat-icon-button
            (click)="deleteTargetCreation(targetCreation.id, targetCreation.name)"
            class="mat-icon-button-sm"
            title="Delete target creation"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </tr>
    </table>
  `,
  styleUrls: ['./target-creation-list.component.css']
})
export class TargetCreationListComponent {
  /**
   * List of target creations to display
   */
  @Input() targetCreations: TargetCreationListItem[] = [];

  /**
   * Project key for creating new target creations
   */
  @Input() projectKey: string = '';

  /**
   * Emitted when user clicks to view a target creation
   */
  @Output() targetCreationViewed = new EventEmitter<string>();

  /**
   * Emitted when user clicks to delete a target creation
   */
  @Output() targetCreationDeleted = new EventEmitter<{ id: string; name: string }>();

  /**
   * Emitted when a new target creation is created
   */
  @Output() targetCreationCreated = new EventEmitter<any>();

  /**
   * Emitted when any change occurs (for parent refresh)
   */
  @Output() changed = new EventEmitter<void>();

  /**
   * Current sort state
   */
  sortState: SortState = { col: 'name', dir: 'asc' };

  constructor(private dialog: MatDialog) {}

  /**
   * Sorts target creations by the specified column
   */
  sortTargetCreations(column: 'id' | 'name' | 'version' | 'status' | 'target' | 'total' | 'action_required' | 'resolved' | 'optional_pending'): void {
    this.sortState = {
      col: column,
      dir: (this.sortState.col === column && this.sortState.dir === 'asc') ? 'desc' : 'asc'
    };

    this.targetCreations.sort((a, b) => {
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

  /**
   * Gets the value for sorting from a target creation
   */
  private getValue(targetCreation: TargetCreationListItem, column: string): string | number {
    switch (column) {
      case 'id':
        return targetCreation.id || '';
      case 'name':
        return targetCreation.name || '';
      case 'version':
        return targetCreation.version || '';
      case 'status':
        return targetCreation.status || '';
      case 'target':
        return targetCreation.target?.name || '';
      case 'total':
        return targetCreation.status_counts.total;
      case 'action_required':
        return targetCreation.status_counts.action_required;
      case 'resolved':
        return targetCreation.status_counts.resolved;
      case 'optional_pending':
        return targetCreation.status_counts.optional_pending;
      default:
        return '';
    }
  }

  /**
   * Opens dialog to add a new target creation
   * TODO: Implement AddTargetCreationDialogComponent in Phase 8.4
   */
  openAddTargetCreationDialog(): void {
    // Placeholder for Phase 8.4 - Add Target Creation Dialog
    console.log('Add Target Creation dialog - to be implemented in Phase 8.4');

    // When implemented, will be:
    // const dialogRef = this.dialog.open(AddTargetCreationDialogComponent, {
    //   width: '600px',
    //   data: { projectKey: this.projectKey }
    // });
    //
    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.targetCreationCreated.emit(result);
    //     this.changed.emit();
    //   }
    // });
  }

  /**
   * Emits event to view target creation details
   */
  viewTargetCreation(targetCreationId: string): void {
    this.targetCreationViewed.emit(targetCreationId);
  }

  /**
   * Emits event to delete a target creation
   */
  deleteTargetCreation(targetCreationId: string, targetCreationName: string): void {
    this.targetCreationDeleted.emit({ id: targetCreationId, name: targetCreationName });
    this.changed.emit();
  }
}
