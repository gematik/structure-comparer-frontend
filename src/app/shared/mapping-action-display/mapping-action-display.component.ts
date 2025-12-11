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
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MappingAction, MappingField } from '../../models/mapping.model';
import { ActionInfo } from '../../models/mapping-evaluation.model';
import { RecommendationHelper } from '../../mapping-detail/mapping-detail-helpers';

@Component({
  selector: 'app-mapping-action-display',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './mapping-action-display.component.html',
  styleUrl: './mapping-action-display.component.css'
})
export class MappingActionDisplayComponent {
  @Input() field!: MappingField;
  @Input() compact: boolean = false; // Für kompakte Darstellung in der Tabelle
  @Input() allFields?: MappingField[]; // Optional: Alle Felder für Typ-Lookup bei copy_value_from/copy_value_to
  @Output() applyRecommendation = new EventEmitter<{ field: MappingField; index: number; event: Event }>();
  @Output() editField = new EventEmitter<{ field: MappingField; event: Event }>();

  /**
   * Gets the icon for an action
   */
  getActionIcon(action: MappingAction | null): string {
    if (!action) return 'help_outline';

    const icons: { [key: string]: string } = {
      'use': 'check_circle',
      'use_recursive': 'account_tree',
      'not_use': 'cancel',
      'empty': 'remove_circle_outline',
      'copy_value_from': 'arrow_back',
      'copy_value_to': 'arrow_forward',
      'copy_node_to': 'swap_horiz',
      'copy_node_from': 'swap_horiz',  // Mirrored via CSS transform
      'fixed': 'lock',
      'manual': 'edit',
      'medication_service': 'local_pharmacy'
    };
    return icons[action] || 'help_outline';
  }

  /**
   * Gets the label for an action
   */
  getActionLabel(action: MappingAction | null): string {
    if (!action) return 'KEINE AKTION';

    const labels: { [key: string]: string } = {
      'use': 'USE',
      'use_recursive': 'USE_RECURSIVE',
      'not_use': 'NOT_USE',
      'empty': 'EMPTY',
      'copy_value_from': 'COPY_VALUE_FROM',
      'copy_value_to': 'COPY_VALUE_TO',
      'copy_node_to': 'COPY_NODE_TO',
      'copy_node_from': 'COPY_NODE_FROM',
      'fixed': 'FIXED',
      'manual': 'MANUAL',
      'medication_service': 'MEDICATION_SERVICE'
    };
    return labels[action] || action.toUpperCase();
  }

  /**
   * Gets the description for an action
   */
  getActionDescription(action: MappingAction | null): string {
    if (!action) return 'Noch keine Aktion gewählt';

    const descriptions: { [key: string]: string } = {
      'use': 'Feld wird direkt verwendet',
      'use_recursive': 'Feld und alle Kindelemente werden verwendet',
      'not_use': 'Feld wird nicht verwendet',
      'empty': 'Feld wird geleert',
      'copy_value_from': 'Wert wird aus anderem Feld kopiert',
      'copy_value_to': 'Wert wird in anderes Feld kopiert',
      'copy_node_to': 'Knoten wird in anderes Feld kopiert',
      'copy_node_from': 'Knoten wird von anderem Feld empfangen',
      'fixed': 'Fester Wert wird gesetzt',
      'manual': 'Manuelle Bearbeitung erforderlich',
      'medication_service': 'Medication Service Mapping'
    };
    return descriptions[action] || action;
  }

  /**
   * Check if action requires additional details to be shown
   */
  hasAdditionalDetails(): boolean {
    return !!(this.field.action_info?.other_value ||
              this.field.action_info?.fixed_value ||
              this.field.action_info?.user_remark ||
              this.field.action_info?.system_remark);
  }

  // === RECOMMENDATION METHODS ===

  /**
   * Check if field has a recommendation
   */
  hasRecommendation(): boolean {
    return RecommendationHelper.hasRecommendation(this.field);
  }

  /**
   * Get all recommendations for this field
   */
  getRecommendations(field: MappingField): ActionInfo[] {
    return RecommendationHelper.getRecommendations(field);
  }

  /**
   * Get label for a recommendation
   */
  getRecommendationLabel(recommendation: ActionInfo): string {
    return RecommendationHelper.buildRecommendationLabel(recommendation);
  }

  /**
   * Get tooltip for a recommendation
   */
  getRecommendationTooltip(recommendation: ActionInfo): string {
    return RecommendationHelper.buildRecommendationTooltip(recommendation);
  }

  /**
   * Get recommendation action type for CSS class binding
   */
  getRecommendationAction(recommendation: ActionInfo): string | null {
    return RecommendationHelper.getRecommendationAction(recommendation);
  }

  /**
   * Get the other_value from a recommendation (for copy_value_from/copy_value_to/copy_node_to/copy_node_from)
   */
  getRecommendationOtherValue(recommendation: ActionInfo): string | null {
    // Only show for copy_value_from/copy_value_to/copy_node_to/copy_node_from actions
    if (recommendation.action !== 'copy_value_from'
        && recommendation.action !== 'copy_value_to'
        && recommendation.action !== 'copy_node_to'
        && recommendation.action !== 'copy_node_from') {
      return null;
    }

    // Return other_value if it's a string
    if (recommendation.other_value && typeof recommendation.other_value === 'string') {
      return recommendation.other_value;
    }

    return null;
  }

  /**
   * Get all system remarks from recommendations
   */
  getRecommendationSystemRemarks(): string[] {
    if (!this.field.recommendations || this.field.recommendations.length === 0) {
      return [];
    }

    const remarks: string[] = [];

    for (const rec of this.field.recommendations) {
      // Prefer system_remarks array if available
      if (rec.system_remarks && Array.isArray(rec.system_remarks)) {
        remarks.push(...rec.system_remarks.filter(r => r && r.trim().length > 0));
      }
      // Fallback to single system_remark for backwards compatibility
      else if (rec.system_remark && rec.system_remark.trim().length > 0) {
        remarks.push(rec.system_remark);
      }
    }

    return remarks;
  }

  /**
   * Handle recommendation click to apply it
   */
  onApplyRecommendation(event: Event, index: number = 0): void {
    event.stopPropagation();
    event.preventDefault();
    this.applyRecommendation.emit({ field: this.field, index, event });
  }

  /**
   * Handle edit button click to open the edit dialog
   */
  onEditField(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.editField.emit({ field: this.field, event });
  }

  /**
   * Get types from a field by field name
   * Returns array of type strings or null if field not found or no types available
   */
  getFieldTypes(fieldName: string): string[] | null {
    if (!this.allFields || !fieldName) {
      return null;
    }

    const targetField = this.allFields.find(f => f.name === fieldName);
    if (!targetField || !targetField.profiles) {
      return null;
    }

    // Collect all types from all profiles
    const allTypes = new Set<string>();
    Object.values(targetField.profiles).forEach(profile => {
      if (profile && profile.types) {
        profile.types.forEach(type => allTypes.add(type));
      }
    });

    return allTypes.size > 0 ? Array.from(allTypes) : null;
  }

  /**
   * Format types array for display
   */
  formatTypes(types: string[] | null): string | null {
    if (!types || types.length === 0) {
      return null;
    }
    return types.join(', ');
  }
}
