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
 * Target Creation Detail Component - Phase 8.2 Implementation
 * 
 * Displays detailed view of a Target Creation with field table.
 * Similar to MappingDetailComponent but simplified:
 * - No source profiles
 * - Only manual/fixed actions
 * - No classification column
 * - Simpler status based on mandatory fields
 */

import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { TargetCreationService } from '../target-creation.service';
import { TargetCreationDetail, TargetCreationField, TargetCreationStatusCounts } from '../models/target-creation.model';
import { TreeTableComponent, TreeTableConfig } from '../shared/tree-table/tree-table.component';
import { MappingActionDisplayComponent } from '../shared/mapping-action-display/mapping-action-display.component';
import { MappingStatusDisplayComponent } from '../shared/mapping-status-display/mapping-status-display.component';
import { EditTargetCreationFieldDialogComponent, EditTargetCreationFieldDialogData } from '../edit-target-creation-field-dialog/edit-target-creation-field-dialog.component';

@Component({
  selector: 'app-target-creation-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    MatTooltip,
    TreeTableComponent,
    MappingActionDisplayComponent,
    MappingStatusDisplayComponent,
  ],
  templateUrl: './target-creation-detail.component.html',
  styleUrls: ['./target-creation-detail.component.css'],
})
export class TargetCreationDetailComponent implements OnInit {
  projectKey: string = '';
  targetCreationId: string = '';
  targetCreation: TargetCreationDetail | null = null;
  fields: TargetCreationField[] = [];
  filteredFields: TargetCreationField[] = [];
  textFilterValue: string = '';

  // Expose Math for template
  Math = Math;

  // View settings
  viewMode: 'flat' | 'tree' = 'flat';
  treeTableConfig: TreeTableConfig = { profileColumns: [] };

  @ViewChild(TreeTableComponent) treeTableComponent?: TreeTableComponent;

  // Pagination
  totalLength: number = 0;
  pageSize: number = 200;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 50, 100, 200, 500];

  constructor(
    private route: ActivatedRoute,
    private targetCreationService: TargetCreationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.projectKey = this.route.snapshot.paramMap.get('projectKey') || '';
    this.targetCreationId = this.route.snapshot.paramMap.get('targetCreationId') || '';

    if (this.projectKey && this.targetCreationId) {
      this.loadTargetCreation();
    }
  }

  private loadTargetCreation(): void {
    this.targetCreationService.getTargetCreation(this.projectKey, this.targetCreationId)
      .pipe(catchError(err => {
        console.error('Error loading target creation', err);
        this.snackBar.open('Fehler beim Laden der Target Creation', 'Schließen', { duration: 3000 });
        return of(null);
      }))
      .subscribe(targetCreation => {
        if (targetCreation) {
          this.targetCreation = targetCreation;
          this.fields = targetCreation.fields || [];
          this.filteredFields = [...this.fields];
          this.totalLength = this.fields.length;
          this.updateTreeTableConfig();
        }
      });
  }

  private updateTreeTableConfig(): void {
    this.treeTableConfig = {
      profileColumns: [] // No source profiles for Target Creations
    };
  }

  // === VIEW MODE ===
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'flat' ? 'tree' : 'flat';
  }

  // === FILTERING ===
  applyTextFilter(): void {
    const filterValue = this.textFilterValue.toLowerCase();
    
    if (!filterValue) {
      this.filteredFields = [...this.fields];
    } else {
      this.filteredFields = this.fields.filter(field => 
        field.name.toLowerCase().includes(filterValue) ||
        field.types.some(t => t.toLowerCase().includes(filterValue)) ||
        (field.description && field.description.toLowerCase().includes(filterValue))
      );
    }
    
    this.totalLength = this.filteredFields.length;
    this.pageIndex = 0;
  }

  clearTextFilter(): void {
    this.textFilterValue = '';
    this.applyTextFilter();
  }

  // === FIELD ACTIONS ===
  openEditFieldDialog(field: TargetCreationField): void {
    if (!this.targetCreation) return;

    const dialogData: EditTargetCreationFieldDialogData = {
      field: field,
      projectKey: this.projectKey,
      targetCreationId: this.targetCreationId,
      target: this.targetCreation.target
    };

    const dialogRef = this.dialog.open(EditTargetCreationFieldDialogComponent, {
      width: '800px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTargetCreation(); // Reload to get updated field
      }
    });
  }

  // === STATUS HELPERS ===
  getStatusCounts(): TargetCreationStatusCounts {
    return this.targetCreation?.status_counts || {
      total: 0,
      action_required: 0,
      resolved: 0,
      optional_pending: 0
    };
  }

  getFilteredStatusCounts(): TargetCreationStatusCounts {
    const counts: TargetCreationStatusCounts = {
      total: this.filteredFields.length,
      action_required: 0,
      resolved: 0,
      optional_pending: 0
    };

    this.filteredFields.forEach(field => {
      const hasAction = field.action_info?.action != null;
      const isMandatory = field.min > 0;

      if (hasAction) {
        counts.resolved++;
      } else if (isMandatory) {
        counts.action_required++;
      } else {
        counts.optional_pending++;
      }
    });

    return counts;
  }

  isFilteredView(): boolean {
    return this.filteredFields.length !== this.fields.length;
  }

  // === FIELD FORMATTING ===
  formatCardinality(field: TargetCreationField): string {
    return `${field.min}..${field.max}`;
  }

  getCardinalityStyle(field: TargetCreationField): string {
    return field.min > 0 ? 'font-weight: bold; color: #d32f2f;' : '';
  }

  formatTypes(types: string[]): string {
    return types.join(', ');
  }

  // === EXPORT ===
  exportAsYaml(): void {
    this.snackBar.open('YAML Export wird implementiert', 'OK', { duration: 2000 });
    // TODO: Implement YAML export (manual_entries.yaml format)
  }
}
