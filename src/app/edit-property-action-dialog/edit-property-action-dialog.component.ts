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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ActionOption, MappingAction, MappingField, MappingFieldUpdateRequest } from '../models/mapping.model';
import { MappingActionDisplayComponent } from '../shared/mapping-action-display/mapping-action-display.component';
import { MappingStatusDisplayComponent } from '../shared/mapping-status-display/mapping-status-display.component';
import { ActionSelectionComponent } from './action-selection/action-selection.component';

export interface EditPropertyActionDialogData {
  field: MappingField;
  availableActions: ActionOption[];
  availableFields: { name: string }[];
  allFields?: MappingField[]; // Optional: All fields for type lookup in copy_from/copy_to
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
    MatCheckboxModule,
    MappingActionDisplayComponent,
    MappingStatusDisplayComponent,
    ActionSelectionComponent
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
  typeFilterActive: boolean = true; // Type filter is active by default

  // Info panel toggles
  showClassificationInfo: boolean = false;
  showStatusInfo: boolean = false;

  // Auto-apply children recommendations for extension actions
  applyToChildren: boolean = true; // Default to true for convenience

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
   * Gets tooltip text for classification
   */
  getClassificationTooltip(): string {
    const classification = this.data.field.classification;
    switch (classification) {
      case 'compatible':
        return 'Classification: Compatible - Die Felder passen direkt zusammen und benötigen keine spezielle Behandlung';
      case 'incompatible':
        return 'Classification: Incompatible - Die Felder sind nicht kompatibel, eine Mapping-Aktion ist erforderlich';
      case 'warning':
        return 'Classification: Warning - Es gibt kleinere Probleme, eine Aktion wird empfohlen';
      case 'unknown':
        return 'Classification: Unknown - Die Kompatibilität konnte nicht bestimmt werden';
      default:
        return `Classification: ${classification}`;
    }
  }

  /**
   * Gets tooltip text for mapping status
   */
  getMappingStatusTooltip(): string {
    if (!this.data.field.evaluation) {
      return '';
    }
    const status = this.data.field.evaluation.mapping_status;
    switch (status) {
      case 'compatible':
        return 'Mapping Status: Compatible - Keine Probleme, das Feld ist fertig bearbeitet';
      case 'warning':
        return 'Mapping Status: Warning - Eine Warnung ist vorhanden, aber keine Aktion wurde ausgewählt';
      case 'incompatible':
        return 'Mapping Status: Incompatible - Ein Problem besteht, eine Aktion ist erforderlich';
      case 'solved':
        return 'Mapping Status: Solved - Das Problem wurde durch eine manuelle/geerbte Aktion gelöst';
      default:
        return `Mapping Status: ${status}`;
    }
  }

  /**
   * Checks if the field has recommendations
   */
  hasRecommendations(): boolean {
    return !!(this.data.field.recommendations && this.data.field.recommendations.length > 0);
  }

  /**
   * Gets the types for the current field
   */
  getFieldTypes(): string {
    const fieldProfiles = this.data.field.profiles || {};
    const allTypes = new Set<string>();

    Object.values(fieldProfiles).forEach(profile => {
      if (profile && profile.types) {
        profile.types.forEach(type => allTypes.add(type));
      }
    });

    return allTypes.size > 0 ? Array.from(allTypes).join(', ') : '';
  }

  /**
   * Gets the types for a specific field by name from allFields
   */
  getTypesForField(fieldName: string): string {
    if (!this.data.allFields) {
      return '';
    }

    const field = this.data.allFields.find(f => f.name === fieldName);
    if (!field || !field.profiles) {
      return '';
    }

    const allTypes = new Set<string>();
    Object.values(field.profiles).forEach(profile => {
      if (profile && profile.types) {
        profile.types.forEach(type => allTypes.add(type));
      }
    });

    return allTypes.size > 0 ? Array.from(allTypes).join(', ') : '';
  }

  /**
   * Gets the profile names where a specific field exists
   * Returns an array of profile display names
   */
  getProfilesForField(fieldName: string): string[] {
    if (!this.data.allFields) {
      return [];
    }

    const field = this.data.allFields.find(f => f.name === fieldName);
    if (!field || !field.profiles) {
      return [];
    }

    const profileNames: string[] = [];

    // Get relevant profiles based on copy_from/copy_to action
    if (this.selectedAction === 'copy_from') {
      // Show source profiles
      this.data.sources.forEach(source => {
        const profileKey = (source as any).key || source.name;
        if (field.profiles![profileKey]) {
          const packageName = (source as any).package;
          const displayName = packageName ? `${packageName}.${source.name}` : source.name;
          profileNames.push(displayName);
        }
      });
    } else if (this.selectedAction === 'copy_to') {
      // Show target profile
      const targetKey = (this.data.target as any).key || this.data.target.name;
      if (field.profiles![targetKey]) {
        const packageName = (this.data.target as any).package;
        const displayName = packageName ? `${packageName}.${this.data.target.name}` : this.data.target.name;
        profileNames.push(displayName);
      }
    }

    return profileNames;
  }

  /**
   * Gets source profiles where this field exists
   */
  getSourceProfiles(): Array<{name: string, package?: string}> {
    const fieldProfiles = this.data.field.profiles || {};
    const sourceProfiles: Array<{name: string, package?: string}> = [];

    this.data.sources.forEach(source => {
      if (fieldProfiles[source.name] || fieldProfiles[(source as any).key]) {
        sourceProfiles.push({
          name: source.name,
          package: (source as any).package
        });
      }
    });

    return sourceProfiles;
  }

  /**
   * Gets target profile if this field exists in it
   */
  getTargetProfile(): {name: string, package?: string} | null {
    const fieldProfiles = this.data.field.profiles || {};
    const targetKey = (this.data.target as any).key || this.data.target.name;

    if (fieldProfiles[this.data.target.name] || fieldProfiles[targetKey]) {
      return {
        name: this.data.target.name,
        package: (this.data.target as any).package
      };
    }

    return null;
  }

  /**
   * Extracts the suffix (last segment after last dot) from the field name
   * Only auto-activates if it's one of the predefined suffixes
   */
  extractSuffixFromFieldName(): void {
    const predefinedSuffixes = ['extension', 'code', 'value', 'value[x]', 'url', 'id', 'system'];
    const fieldName = this.data.field.name;
    const lastDotIndex = fieldName.lastIndexOf('.');

    if (lastDotIndex !== -1 && lastDotIndex < fieldName.length - 1) {
      const suffix = fieldName.substring(lastDotIndex + 1);
      this.suffixFilter = suffix;

      // Only auto-activate if it's a predefined suffix
      const isPredefined = predefinedSuffixes.some(
        predefined => predefined.toLowerCase() === suffix.toLowerCase()
      );

      if (isPredefined) {
        this.suffixFilterActive = true;
        // Apply initial filter when suffix is active
        this.applyFieldFilter('');
      } else {
        // For custom suffixes, suggest but don't activate
        this.suffixFilterActive = false;
      }
    }
  }

  /**
   * Gets available suffix options based on actual fields
   * Only returns suffixes that exist in the current filtered field set
   * If the current field has a predefined suffix, only show that one
   * If it has a custom suffix, suggest it but don't activate it by default
   */
  getAvailableSuffixes(): string[] {
    const predefinedSuffixes = ['extension', 'code', 'value', 'value[x]', 'url', 'id', 'system'];

    // Check if the current field has one of the predefined suffixes
    const currentFieldName = this.data.field.name.toLowerCase();
    const currentFieldSuffix = predefinedSuffixes.find(suffix =>
      currentFieldName.endsWith('.' + suffix.toLowerCase())
    );

    // If current field has a predefined suffix, only show that one
    if (currentFieldSuffix) {
      return [currentFieldSuffix];
    }

    // Check if field has a custom suffix (last word after last dot)
    const lastDotIndex = currentFieldName.lastIndexOf('.');
    if (lastDotIndex !== -1 && lastDotIndex < currentFieldName.length - 1) {
      const customSuffix = this.data.field.name.substring(lastDotIndex + 1);
      // Return the custom suffix (will be shown but not activated by default)
      return [customSuffix];
    }

    // Otherwise, show all available predefined suffixes from the filtered fields
    const available = this.data.availableFields ?? [];
    const relevantProfileNames = this.getRelevantProfileNames();

    // Get fields that match the profile filter (same as in applyFieldFilter)
    let relevantFields = available;
    if (this.requiresTargetField() && relevantProfileNames.length > 0) {
      relevantFields = available.filter(field => {
        const fieldProfiles = (field as any).profiles;
        if (fieldProfiles) {
          return relevantProfileNames.some(
            profileName => fieldProfiles[profileName]
          );
        }
        return false;
      });
    }

    // Check which predefined suffixes actually exist in the relevant fields
    const availableSuffixes = predefinedSuffixes.filter(suffix => {
      return relevantFields.some(field => {
        const fieldNameLower = field.name.toLowerCase();
        return fieldNameLower.endsWith(suffix.toLowerCase());
      });
    });

    return availableSuffixes;
  }

  /**
   * Sets a specific suffix filter
   * If the same suffix is clicked again, toggle it off
   */
  setSuffixFilter(suffix: string): void {
    // Toggle off if clicking the same suffix
    if (this.suffixFilterActive && this.suffixFilter === suffix) {
      this.suffixFilterActive = false;
      this.suffixFilter = '';
    } else {
      this.suffixFilter = suffix;
      this.suffixFilterActive = true;
    }
    this.applyFieldFilter(this.targetField);
  }

  /**
   * Toggles the suffix filter on/off
   */
  toggleSuffixFilter(): void {
    this.suffixFilterActive = !this.suffixFilterActive;
    this.applyFieldFilter(this.targetField);
  }

  /**
   * Toggles the type filter on/off
   */
  toggleTypeFilter(): void {
    this.typeFilterActive = !this.typeFilterActive;
    this.applyFieldFilter(this.targetField);
  }

  /**
   * Applies combined filtering: suffix (if active) + type (if active) + user search query + profile-based filtering
   */
  applyFieldFilter(searchQuery: string): void {
    const query = searchQuery.trim().toLowerCase();
    const available = this.data.availableFields ?? [];
    const relevantProfileNames = this.getRelevantProfileNames();

    // Get current field types for type filtering
    const currentFieldTypes = this.typeFilterActive ? new Set(this.getFieldTypes().split(', ').map(t => t.trim())) : null;

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

      // Type filter: only show fields with matching types
      if (this.typeFilterActive && currentFieldTypes && currentFieldTypes.size > 0) {
        const fieldTypes = this.getTypesForField(field.name);
        if (fieldTypes) {
          const fieldTypeSet = new Set(fieldTypes.split(', ').map(t => t.trim()));
          // Check if there's any overlap between current field types and this field's types
          const hasMatchingType = Array.from(currentFieldTypes).some(type => fieldTypeSet.has(type));
          if (!hasMatchingType) {
            return false;
          }
        } else {
          // If field has no types, exclude it when type filter is active
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
   * Checks if the current action requires a target field
   */
  requiresTargetField(): boolean {
    return this.selectedAction === 'copy_from' || this.selectedAction === 'copy_to' || this.selectedAction === 'extension';
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
    // Allow saving with null (removes action)
    if (this.selectedAction === null) {
      return true;
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
   * Removes the current action (sets to null)
   */
  removeAction(): void {
    this.selectedAction = null;
    this.onActionChange();
  }

  /**
   * Handles save button click
   */
  onSave(): void {
    if (!this.isValid()) {
      return;
    }

    const updateRequest: MappingFieldUpdateRequest = {
      action: this.selectedAction
    };

    // Add conditional fields based on action (only if action is not null)
    if (this.selectedAction !== null) {
      if (this.requiresTargetField()) {
        updateRequest.other = this.targetField.trim();
      }
      if (this.requiresFixedValue()) {
        updateRequest.fixed = this.fixedValue.trim();
      }
      if (this.allowsRemark() && this.remarkText.trim()) {
        updateRequest.remark = this.remarkText.trim();
      }
    }

    // Return both the update request and the applyToChildren flag for extension actions
    const result: any = { updateRequest };
    if (this.selectedAction === 'extension' && this.applyToChildren) {
      result.applyToChildren = true;
    }

    this.dialogRef.close(result);
  }

  /**
   * Handles cancel button click
   */
  onCancel(): void {
    this.dialogRef.close();
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
