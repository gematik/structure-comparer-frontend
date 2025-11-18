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
import { Mapping } from '../../models/mapping.model';
import { AddMappingDialogComponent } from '../../add-mapping-dialog/add-mapping-dialog.component';

type SortState = { col: string; dir: 'asc' | 'desc' };

@Component({
  selector: 'app-mapping-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIcon],
  template: `
    <h2 class="section-heading">List of Mappings</h2>
    <table class="modern-table">
      <tr>
        <th class="col-wide clickable" (click)="sortMappings('name')">
          Mapping Name
          <span *ngIf="sortState.col === 'name'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortMappings('totalCount')">
          Gesamt
          <span *ngIf="sortState.col === 'totalCount'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortMappings('compatibleCount')">
          Kompatibel
          <span *ngIf="sortState.col === 'compatibleCount'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortMappings('resolvedCount')">
          Gelöst
          <span *ngIf="sortState.col === 'resolvedCount'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow clickable" (click)="sortMappings('needsActionCount')">
          Aktion erforderlich
          <span *ngIf="sortState.col === 'needsActionCount'">
            {{ sortState.dir === "asc" ? "▲" : "▼" }}
          </span>
        </th>
        <th class="col-narrow">
          Action
          <button
            mat-icon-button
            (click)="openAddMappingDialog()"
            title="Add new mapping"
            class="mat-icon-button-sm"
          >
            <mat-icon>add-box</mat-icon>
          </button>
        </th>
      </tr>

      <tr *ngFor="let mapping of mappings" class="hover-highlight">
        <td class="clickable-cell" (click)="viewMapping(mapping.id)">
          {{ mapping.name }}
        </td>
        <td>
          <span class="pill pill--total">{{ mapping.totalCount ?? 0 }}</span>
        </td>
        <td>
          <span class="pill pill--compatible">{{ mapping.compatibleCount ?? 0 }}</span>
        </td>
        <td>
          <span class="pill pill--resolved">{{ mapping.resolvedCount ?? 0 }}</span>
        </td>
        <td>
          <span class="pill pill--needs-action">{{ mapping.needsActionCount ?? 0 }}</span>
        </td>
        <td>
          <button
            mat-icon-button
            (click)="viewMapping(mapping.id)"
            class="mat-icon-button-sm"
            title="Edit mapping"
          >
            <mat-icon>remove_red_eye</mat-icon>
          </button>
          <button
            mat-icon-button
            (click)="deleteMapping(mapping.id, mapping.name)"
            class="mat-icon-button-sm"
            title="Delete mapping"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </tr>
    </table>
  `,
  styleUrls: ['./mapping-list.component.css']
})
export class MappingListComponent {
  @Input() mappings: Mapping[] = [];
  @Input() projectKey: string = '';

  @Output() mappingViewed = new EventEmitter<string>();
  @Output() mappingDeleted = new EventEmitter<{ id: string; name: string }>();
  @Output() mappingCreated = new EventEmitter<any>();

  sortState: SortState = { col: 'name', dir: 'asc' };

  constructor(private dialog: MatDialog) {}

  sortMappings(column: 'name' | 'totalCount' | 'compatibleCount' | 'resolvedCount' | 'needsActionCount'): void {
    this.sortState = {
      col: column,
      dir: (this.sortState.col === column && this.sortState.dir === 'asc') ? 'desc' : 'asc'
    };

    this.mappings.sort((a, b) => {
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

  private getValue(mapping: any, column: string): string | number {
    switch (column) {
      case 'name':
        return mapping.name || '';
      case 'totalCount':
        return mapping.totalCount ?? 0;
      case 'compatibleCount':
        return mapping.compatibleCount ?? 0;
      case 'resolvedCount':
        return mapping.resolvedCount ?? 0;
      case 'needsActionCount':
        return mapping.needsActionCount ?? 0;
      default:
        return '';
    }
  }

  openAddMappingDialog(): void {
    const dialogRef = this.dialog.open(AddMappingDialogComponent, {
      width: '600px',
      data: { projectKey: this.projectKey }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.mappingCreated.emit(result);
      }
    });
  }

  viewMapping(mappingId: string): void {
    this.mappingViewed.emit(mappingId);
  }

  deleteMapping(mappingId: string, mappingName: string): void {
    this.mappingDeleted.emit({ id: mappingId, name: mappingName });
  }
}
