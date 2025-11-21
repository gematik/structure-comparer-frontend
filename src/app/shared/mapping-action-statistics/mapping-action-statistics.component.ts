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
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MappingAction, MappingField } from '../../models/mapping.model';
import { MappingStatus } from '../../models/mapping-evaluation.model';
import { StatusHelper } from '../../mapping-detail/mapping-detail-helpers';

export interface ActionStatistic {
  action: MappingAction;
  count: number;
  icon: string;
  label: string;
  cssClass: string;
}

@Component({
  selector: 'app-mapping-action-statistics',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './mapping-action-statistics.component.html',
  styleUrl: './mapping-action-statistics.component.css'
})
export class MappingActionStatisticsComponent implements OnChanges {
  @Input() fields: MappingField[] = [];
  @Input() selectedActions: MappingAction[] = [];
  @Input() textFilterValue: string = '';
  @Output() actionsSelected = new EventEmitter<MappingAction[]>();
  @Output() textFilterChanged = new EventEmitter<string>();

  actionStatistics: ActionStatistic[] = [];
  totalProblemsResolved: number = 0;

  // Helper function to get field status using StatusHelper
  private getFieldStatus(field: MappingField): MappingStatus {
    return StatusHelper.getFieldStatus(field);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields']) {
      this.calculateStatistics();
    }
  }

  private calculateStatistics(): void {
    // Filter fields that had warnings or incompatibilities
    const problematicFields = this.fields.filter(field => {
      const status = this.getFieldStatus(field);
      return status === 'warning' || status === 'incompatible' || status === 'solved';
    });

    // Count total problems that were resolved (solved status)
    this.totalProblemsResolved = this.fields.filter(field => {
      return this.getFieldStatus(field) === 'solved';
    }).length;

    // Count actions used on problematic fields
    const actionCounts = new Map<MappingAction, number>();

    problematicFields.forEach(field => {
      if (field.action) {
        const currentCount = actionCounts.get(field.action) || 0;
        actionCounts.set(field.action, currentCount + 1);
      }
    });

    // Create statistics array
    this.actionStatistics = [];
    const actionsToDisplay: MappingAction[] = ['use', 'not_use', 'empty', 'copy_from', 'copy_to', 'fixed', 'manual'];

    actionsToDisplay.forEach(action => {
      const count = actionCounts.get(action) || 0;
      if (count > 0) {
        this.actionStatistics.push({
          action,
          count,
          icon: this.getActionIcon(action),
          label: this.getActionLabel(action),
          cssClass: this.getActionCssClass(action)
        });
      }
    });

    // Sort by count (descending)
    this.actionStatistics.sort((a, b) => b.count - a.count);
  }

  /**
   * Gets the icon for an action
   */
  private getActionIcon(action: MappingAction): string {
    const icons: { [key: string]: string } = {
      'use': 'check_circle',
      'not_use': 'cancel',
      'empty': 'remove_circle_outline',
      'copy_from': 'arrow_back',
      'copy_to': 'arrow_forward',
      'fixed': 'lock',
      'manual': 'edit',
      'medication_service': 'local_pharmacy'
    };
    return icons[action!] || 'help_outline';
  }

  /**
   * Gets the label for an action
   */
  getActionLabel(action: MappingAction): string {
    const labels: { [key: string]: string } = {
      'use': 'USE',
      'not_use': 'NOT_USE',
      'empty': 'EMPTY',
      'copy_from': 'COPY_FROM',
      'copy_to': 'COPY_TO',
      'fixed': 'FIXED',
      'manual': 'MANUAL',
      'medication_service': 'MEDICATION_SERVICE'
    };
    return labels[action!] || action!.toUpperCase();
  }

  /**
   * Gets the CSS class for an action
   */
  private getActionCssClass(action: MappingAction): string {
    return `action-chip--${action}`;
  }

  /**
   * Handle click on action badge - toggle selection
   */
  onActionClick(action: MappingAction): void {
    const currentSelection = [...this.selectedActions];
    const index = currentSelection.indexOf(action);

    if (index > -1) {
      // Action is selected, remove it
      currentSelection.splice(index, 1);
    } else {
      // Action is not selected, add it
      currentSelection.push(action);
    }

    this.actionsSelected.emit(currentSelection);
  }

  /**
   * Clear all filters
   */
  clearFilter(): void {
    this.actionsSelected.emit([]);
  }

  /**
   * Get tooltip for action
   */
  getActionTooltip(stat: ActionStatistic): string {
    const baseText = `${stat.count} Feld${stat.count !== 1 ? 'er' : ''} mit Aktion "${stat.label}"`;
    const action = this.isActive(stat.action) ? 'Klicken zum Abwählen' : 'Klicken zum Filtern';
    return `${baseText}. ${action}.`;
  }

  /**
   * Check if badge is active
   */
  isActive(action: MappingAction): boolean {
    return this.selectedActions.includes(action);
  }

  /**
   * Handle text filter input
   */
  onTextFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.textFilterChanged.emit(value);
  }
}
