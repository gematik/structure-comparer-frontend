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
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActionOption, MappingAction, MappingField } from '../../models/mapping.model';

@Component({
  selector: 'app-action-selection',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './action-selection.component.html',
  styleUrl: './action-selection.component.css'
})
export class ActionSelectionComponent {
  @Input() field!: MappingField;
  @Input() availableActions!: ActionOption[];
  @Input() selectedAction: MappingAction | null = null;
  @Output() actionSelected = new EventEmitter<MappingAction>();
  @Output() actionRemoved = new EventEmitter<void>();

  showActionInfo: boolean = false;

  /**
   * Gets available actions filtered by what's allowed for this field
   */
  getFilteredActions(): ActionOption[] {
    return this.availableActions.filter(action =>
      this.field.actions_allowed.includes(action.value)
    );
  }

  /**
   * Gets the icon for an action
   */
  getActionIcon(action: MappingAction): string {
    if (!action) return '';

    const icons: { [key: string]: string } = {
      'use': 'check_circle',
      'use_recursive': 'account_tree',
      'not_use': 'cancel',
      'empty': 'remove_circle_outline',
      'copy_value_from': 'arrow_back',
      'copy_value_to': 'arrow_forward',
      'fixed': 'lock',
      'manual': 'edit',
      'copy_node_to': 'swap_horiz',
      'copy_node_from': 'swap_horiz'
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
      'use_recursive': 'USE_RECURSIVE',
      'not_use': 'NOT_USE',
      'empty': 'EMPTY',
      'copy_value_from': 'COPY_VALUE_FROM',
      'copy_value_to': 'COPY_VALUE_TO',
      'fixed': 'FIXED',
      'manual': 'MANUAL',
      'copy_node_to': 'COPY_NODE_TO',
      'copy_node_from': 'COPY_NODE_FROM'
    };
    return labels[action] || action.toUpperCase();
  }

  /**
   * Gets the instruction text for the selected action
   */
  getActionInstruction(): string {
    const action = this.availableActions.find(a => a.value === this.selectedAction);
    return action?.instruction || '';
  }

  /**
   * Handles action selection from buttons
   */
  selectAction(action: MappingAction): void {
    this.selectedAction = action;
    this.actionSelected.emit(action);
  }

  /**
   * Removes the current action
   */
  removeAction(): void {
    this.selectedAction = null;
    this.actionRemoved.emit();
  }
}
