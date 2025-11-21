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
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MappingAction, MappingField } from '../../models/mapping.model';

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
      'copy_from': 'arrow_back',
      'copy_to': 'arrow_forward',
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
      'copy_from': 'COPY_FROM',
      'copy_to': 'COPY_TO',
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
      'copy_from': 'Wert wird aus anderem Feld kopiert',
      'copy_to': 'Wert wird in anderes Feld kopiert',
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
}
