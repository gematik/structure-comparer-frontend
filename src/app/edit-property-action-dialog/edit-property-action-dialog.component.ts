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
import { MappingActionDisplayComponent } from '../shared/mapping-action-display/mapping-action-display.component';

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
    MatTooltipModule,
    MappingActionDisplayComponent
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
  suffixFilter: string = '';
  suffixFilterActive: boolean = false;

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
    // Extract suffix from field name for filtering
    this.extractSuffixFromFieldName();
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

  /**
   * Extracts the suffix (last segment after last dot) from the field name
   */
  extractSuffixFromFieldName(): void {
    const fieldName = this.data.field.name;
    const lastDotIndex = fieldName.lastIndexOf('.');
    if (lastDotIndex !== -1 && lastDotIndex < fieldName.length - 1) {
      this.suffixFilter = fieldName.substring(lastDotIndex + 1);
      this.suffixFilterActive = true;
      // Apply initial filter when suffix is active
      this.applyFieldFilter('');
    }
  }

  /**
   * Toggles the suffix filter on/off
   */
  toggleSuffixFilter(): void {
    this.suffixFilterActive = !this.suffixFilterActive;
    this.applyFieldFilter(this.targetField);
  }

  /**
   * Applies combined filtering: suffix (if active) + user search query
   */
  applyFieldFilter(searchQuery: string): void {
    const query = searchQuery.trim().toLowerCase();
    const available = this.data.availableFields ?? [];

    this.filteredFields = available.filter(field => {
      const fieldNameLower = field.name.toLowerCase();
      
      // First check suffix filter if active
      if (this.suffixFilterActive && this.suffixFilter) {
        const suffixLower = this.suffixFilter.toLowerCase();
        if (!fieldNameLower.endsWith(suffixLower)) {
          return false;
        }
      }

      // Then check search query
      if (query) {
        return fieldNameLower.includes(query);
      }

      return true;
    });
  }

  onFieldInputChange(value: string): void {
    this.applyFieldFilter(value);
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
    
    // Re-extract suffix when copy_from or copy_to is selected
    if (this.requiresTargetField()) {
      this.extractSuffixFromFieldName();
    }
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
