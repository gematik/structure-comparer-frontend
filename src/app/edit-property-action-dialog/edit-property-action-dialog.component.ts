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
  sources: { name: string }[];
  target: { name: string };
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
   * Determines if the current field belongs to source profiles
   * A field belongs to source if it exists in any source profile but not exclusively in target
   */
  private isFieldInSourceProfile(): boolean {
    const fieldProfiles = this.data.field.profiles || {};
    const sourceProfileNames = this.data.sources.map(s => s.name);

    // Check if field exists in any source profile
    return sourceProfileNames.some(sourceName => fieldProfiles[sourceName]);
  }

  /**
   * Determines if the current field belongs to target profile
   */
  private isFieldInTargetProfile(): boolean {
    const fieldProfiles = this.data.field.profiles || {};
    const targetProfileName = this.data.target.name;

    return !!fieldProfiles[targetProfileName];
  }

  /**
   * Gets the list of profile names that should be used for filtering available fields
   * For copy_from: if current field is in target, show fields from source profiles
   * For copy_to: if current field is in source, show fields from target profile
   */
  private getRelevantProfileNames(): string[] {
    if (this.selectedAction === 'copy_from') {
      // Current field is in target, so we want to copy FROM source fields
      return this.data.sources.map(s => (s as any).key || s.name);
    } else if (this.selectedAction === 'copy_to') {
      // Current field is in source, so we want to copy TO target fields
      return [(this.data.target as any).key || this.data.target.name];
    }
    return [];
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
   * Applies combined filtering: suffix (if active) + user search query + profile-based filtering
   */
  applyFieldFilter(searchQuery: string): void {
    const query = searchQuery.trim().toLowerCase();
    const available = this.data.availableFields ?? [];
    const relevantProfileNames = this.getRelevantProfileNames();

    this.filteredFields = available.filter(field => {
      const fieldNameLower = field.name.toLowerCase();

      // Profile-based filtering for copy_from/copy_to actions
      if (this.requiresTargetField() && relevantProfileNames.length > 0) {
        // Check if this field exists in any of the relevant profiles
        // The field object should already have profiles information
        const fieldProfiles = (field as any).profiles;

        if (fieldProfiles) {
          const existsInRelevantProfile = relevantProfileNames.some(
            profileName => fieldProfiles[profileName]
          );

          // Only include fields that exist in the relevant profiles (source or target)
          if (!existsInRelevantProfile) {
            return false;
          }
        } else {
          // If field doesn't have profiles info, exclude it from copy operations
          return false;
        }
      }

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
    return this.selectedAction === 'manual';
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
      'manual': 'edit'
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
      'manual': 'MANUAL'
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

  /**
   * Gets a hint text explaining which profile's fields are shown
   */
  getProfileFilterHint(): string {
    if (!this.requiresTargetField()) {
      return '';
    }

    const relevantProfileNames = this.getRelevantProfileNames();
    if (relevantProfileNames.length === 0) {
      return '';
    }

    if (this.selectedAction === 'copy_from') {
      return `Nur Felder aus Source-Profil(en): ${relevantProfileNames.join(', ')}`;
    } else if (this.selectedAction === 'copy_to') {
      return `Nur Felder aus Target-Profil: ${relevantProfileNames.join(', ')}`;
    }

    return '';
  }
}
