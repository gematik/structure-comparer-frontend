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
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActionOption, MappingAction, MappingField, MappingFieldUpdateRequest } from '../models/mapping.model';

export interface EditPropertyActionDialogData {
  field: MappingField;
  availableActions: ActionOption[];
  availableFields: { name: string }[];
  projectKey: string;
  mappingId: string;
}

@Component({
  selector: 'app-edit-property-action-dialog',
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
    MatAutocompleteModule,
    MatTooltipModule
  ],
  templateUrl: './edit-property-action-dialog.component.html',
  styleUrl: './edit-property-action-dialog.component.css'
})
export class EditPropertyActionDialogComponent implements OnInit {

  selectedAction: MappingAction | null;
  targetField: string = '';
  fixedValue: string = '';
  remarkText: string = '';
  filteredFields: { name: string }[] = [];

  constructor(
    public dialogRef: MatDialogRef<EditPropertyActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditPropertyActionDialogData
  ) {
    // Initialize with current values (may be null if no action selected yet)
    this.selectedAction = data.field.action ?? null;
    this.targetField = data.field.other || '';
    this.fixedValue = data.field.fixed || '';
    this.remarkText = data.field.remark || '';
    this.filteredFields = [...(data.availableFields ?? [])];
  }

  ngOnInit(): void {
    // Component initialization
  }

  /**
   * Gets the human-readable description for an action value
   */
  getActionDescription(actionValue: MappingAction | null): string {
    if (actionValue === null) {
      return 'Noch keine Aktion gewählt';
    }
    const action = this.data.availableActions.find(a => a.value === actionValue);
    return action?.description || actionValue;
  }

  onFieldInputChange(value: string): void {
    const query = value.trim().toLowerCase();
    if (!query) {
      this.filteredFields = [...this.data.availableFields];
      return;
    }

    const available = this.data.availableFields ?? [];
    this.filteredFields = available.filter(field =>
      field.name.toLowerCase().includes(query)
    );
  }

  /**
   * Gets available actions filtered by what's allowed for this field
   */
  getFilteredActions(): ActionOption[] {
    return this.data.availableActions.filter(action =>
      this.data.field.actions_allowed.includes(action.value)
    );
  }

  /**
   * Checks if the current action requires a target field
   */
  requiresTargetField(): boolean {
    return this.selectedAction === 'copy_from' || this.selectedAction === 'copy_to';
  }

  /**
   * Checks if the current action requires a fixed value
   */
  requiresFixedValue(): boolean {
    return this.selectedAction === 'fixed';
  }

  /**
   * Checks if the current action allows remarks
   */
  allowsRemark(): boolean {
    return this.selectedAction === 'manual' || this.selectedAction === 'extension';
  }

  /**
   * Validates the current form state
   */
  isValid(): boolean {
    // Must select an action (cannot save with null)
    if (this.selectedAction === null) {
      return false;
    }
    if (this.requiresTargetField() && !this.targetField.trim()) {
      return false;
    }
    if (this.requiresFixedValue() && !this.fixedValue.trim()) {
      return false;
    }
    return true;
  }

  /**
   * Handles action selection from buttons
   */
  selectAction(action: MappingAction): void {
    this.selectedAction = action;
    this.onActionChange();
  }

  /**
   * Handles action selection change
   */
  onActionChange(): void {
    // Clear dependent fields when action changes
    if (!this.requiresTargetField()) {
      this.targetField = '';
    }
    if (!this.requiresFixedValue()) {
      this.fixedValue = '';
    }
    if (!this.allowsRemark()) {
      this.remarkText = '';
    }
  }

  /**
   * Gets the icon for an action
   */
  getActionIcon(action: MappingAction): string {
    if (!action) return '';

    const icons: { [key: string]: string } = {
      'use': 'check_circle',
      'not_use': 'cancel',
      'empty': 'remove_circle_outline',
      'copy_from': 'arrow_back',
      'copy_to': 'arrow_forward',
      'fixed': 'lock',
      'manual': 'edit',
      'extension': 'extension'
    };
    return icons[action] || 'help_outline';
  }

  /**
   * Gets the label for an action button
   */
  getActionLabel(action: MappingAction): string {
    if (!action) return '';

    const labels: { [key: string]: string } = {
      'use': 'USE',
      'not_use': 'NOT_USE',
      'empty': 'EMPTY',
      'copy_from': 'COPY_FROM',
      'copy_to': 'COPY_TO',
      'fixed': 'FIXED',
      'manual': 'MANUAL',
      'extension': 'EXTENSION'
    };
    return labels[action] || action.toUpperCase();
  }

  /**
   * Handles save button click
   */
  onSave(): void {
    if (!this.isValid()) {
      return;
    }

    // Ensure an action is selected (TypeScript narrowing)
    if (this.selectedAction === null) {
      return;
    }

    const updateRequest: MappingFieldUpdateRequest = {
      action: this.selectedAction
    };

    // Add conditional fields based on action
    if (this.requiresTargetField()) {
      updateRequest.other = this.targetField.trim();
    }
    if (this.requiresFixedValue()) {
      updateRequest.fixed = this.fixedValue.trim();
    }
    if (this.allowsRemark() && this.remarkText.trim()) {
      updateRequest.remark = this.remarkText.trim();
    }

    this.dialogRef.close(updateRequest);
  }

  /**
   * Handles cancel button click
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Gets the instruction text for the selected action
   */
  getActionInstruction(): string {
    const action = this.data.availableActions.find(a => a.value === this.selectedAction);
    return action?.instruction || '';
  }
}
