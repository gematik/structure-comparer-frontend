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
 * Edit Target Creation Field Dialog - Phase 8.3 Implementation
 *
 * Simplified version of EditPropertyActionDialog for Target Creations.
 * Only supports manual and fixed actions (no copy_value_from, copy_value_to, etc.)
 */

import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TargetCreationAction, TargetCreationField, TargetCreationFieldUpdate, ProfileInfo } from '../models/target-creation.model';
import { TargetCreationService } from '../target-creation.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface EditTargetCreationFieldDialogData {
  field: TargetCreationField;
  projectKey: string;
  targetCreationId: string;
  target: ProfileInfo;
}

@Component({
  selector: 'app-edit-target-creation-field-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './edit-target-creation-field-dialog.component.html',
  styleUrl: './edit-target-creation-field-dialog.component.css'
})
export class EditTargetCreationFieldDialogComponent {
  selectedAction: TargetCreationAction | null;
  fixedValue: string = '';
  remarkText: string = '';
  isSaving: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<EditTargetCreationFieldDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditTargetCreationFieldDialogData,
    private targetCreationService: TargetCreationService,
    private snackBar: MatSnackBar
  ) {
    // Initialize with current values
    this.selectedAction = data.field.action_info?.action as TargetCreationAction || null;
    this.fixedValue = (data.field.action_info?.fixed_value as string) || '';
    this.remarkText = data.field.action_info?.user_remark || '';
  }

  onActionChange(): void {
    // Clear values when action changes
    if (this.selectedAction === 'fixed') {
      this.remarkText = '';
    } else if (this.selectedAction === 'manual') {
      this.fixedValue = '';
    }
  }

  canSave(): boolean {
    if (!this.selectedAction) {
      return false;
    }

    if (this.selectedAction === 'fixed') {
      return this.fixedValue.trim().length > 0;
    }

    // For manual, remark is optional
    return true;
  }

  save(): void {
    if (!this.canSave() || this.isSaving) {
      return;
    }

    this.isSaving = true;

    const update: TargetCreationFieldUpdate = {
      action: this.selectedAction!,
      fixed: this.selectedAction === 'fixed' ? this.fixedValue : undefined,
      remark: this.selectedAction === 'manual' ? this.remarkText : undefined
    };

    this.targetCreationService.setField(
      this.data.projectKey,
      this.data.targetCreationId,
      this.data.field.name,
      update
    ).subscribe({
      next: () => {
        this.snackBar.open('Field action updated successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error updating field action', err);
        this.snackBar.open('Error updating field action', 'Close', { duration: 3000 });
        this.isSaving = false;
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  formatCardinality(): string {
    return `${this.data.field.min}..${this.data.field.max}`;
  }

  isMandatory(): boolean {
    return this.data.field.min > 0;
  }

  getActionIcon(action: TargetCreationAction | null): string {
    if (!action) return 'help_outline';
    const icons: { [key: string]: string } = {
      'manual': 'edit',
      'fixed': 'lock'
    };
    return icons[action] || 'help_outline';
  }

  getActionLabel(action: TargetCreationAction | null): string {
    if (!action) return 'No Action';
    const labels: { [key: string]: string } = {
      'manual': 'Manual',
      'fixed': 'Fixed'
    };
    return labels[action] || action;
  }
}
