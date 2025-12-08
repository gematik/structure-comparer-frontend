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
import { StatusHelper, RecommendationHelper } from '../../mapping-detail/mapping-detail-helpers';

export interface ActionStatistic {
  action: MappingAction;
  count: number;
  icon: string;
  label: string;
  cssClass: string;
}

export interface RecommendationStatistic {
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
  @Input() selectedRecommendations: MappingAction[] = [];
  @Input() textFilterValue: string = '';
  @Output() actionsSelected = new EventEmitter<MappingAction[]>();
  @Output() recommendationsSelected = new EventEmitter<MappingAction[]>();
  @Output() textFilterChanged = new EventEmitter<string>();

  actionStatistics: ActionStatistic[] = [];
  recommendationStatistics: RecommendationStatistic[] = [];
  totalProblemsResolved: number = 0;
  totalFieldsWithRecommendations: number = 0;
  chooseActionCount: number = 0;

  // Helper function to get field status using StatusHelper
  private getFieldStatus(field: MappingField): MappingStatus {
    return StatusHelper.getFieldStatus(field);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields']) {
      this.calculateStatistics();
      this.calculateRecommendationStatistics();
    }
  }

  private calculateStatistics(): void {
    // Count ALL actions across all fields (not just problematic ones)
    const actionCounts = new Map<MappingAction, number>();

    // Count total problems that were resolved (solved status)
    this.totalProblemsResolved = this.fields.filter(field => {
      return this.getFieldStatus(field) === 'solved';
    }).length;

    // Count actions used on ALL fields, including null/undefined (CHOOSE_ACTION)
    this.fields.forEach(field => {
      // Treat both null and undefined as "no action" (CHOOSE_ACTION)
      const action = field.action ?? null;
      const currentCount = actionCounts.get(action) || 0;
      actionCounts.set(action, currentCount + 1);
    });

    // Create statistics array from all actions found
    this.actionStatistics = [];

    // Get all unique actions that exist in the data (EXCLUDING null - CHOOSE_ACTION goes to recommendations)
    actionCounts.forEach((count, action) => {
      if (count > 0 && action !== null) {
        this.actionStatistics.push({
          action,
          count,
          icon: this.getActionIcon(action),
          label: this.getActionLabel(action),
          cssClass: this.getActionCssClass(action)
        });
      }
    });

    // Add CHOOSE_ACTION (null) count - only fields without action AND without recommendations
    // Fields with recommendations are counted in the recommendation statistics
    const fieldsWithoutActionAndWithoutRecommendations = this.fields.filter(field => {
      const hasNoAction = !field.action;
      const hasNoRecommendation = !RecommendationHelper.hasRecommendation(field);
      return hasNoAction && hasNoRecommendation;
    });
    this.chooseActionCount = fieldsWithoutActionAndWithoutRecommendations.length;

    // Sort by count (descending)
    this.actionStatistics.sort((a, b) => b.count - a.count);
  }

  /**
   * Gets the icon for an action
   */
  private getActionIcon(action: MappingAction): string {
    if (action === null || action === undefined) {
      return 'help_outline';
    }
    const icons: { [key: string]: string } = {
      'use': 'check_circle',
      'use_recursive': 'account_tree',
      'not_use': 'cancel',
      'empty': 'remove_circle_outline',
      'copy_from': 'arrow_back',
      'copy_to': 'arrow_forward',
      'fixed': 'lock',
      'manual': 'edit',
      'medication_service': 'local_pharmacy',
      'extension': 'extension'
    };
    return icons[action] || 'help_outline';
  }

  /**
   * Gets the label for an action
   */
  getActionLabel(action: MappingAction): string {
    if (action === null || action === undefined) {
      return 'CHOOSE_ACTION';
    }
    const labels: { [key: string]: string } = {
      'use': 'USE',
      'use_recursive': 'USE_RECURSIVE',
      'not_use': 'NOT_USE',
      'empty': 'EMPTY',
      'copy_from': 'COPY_FROM',
      'copy_to': 'COPY_TO',
      'fixed': 'FIXED',
      'manual': 'MANUAL',
      'medication_service': 'MEDICATION_SERVICE',
      'extension': 'EXTENSION'
    };
    return labels[action] || (action ? action.toUpperCase() : 'UNKNOWN');
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
   * Check if Todo (CHOOSE_ACTION/null) filter is active
   */
  isTodoActive(): boolean {
    return this.selectedActions.includes(null);
  }

  /**
   * Handle click on Todo badge - toggle null action filter
   */
  onTodoClick(): void {
    const currentSelection = [...this.selectedActions];
    const index = currentSelection.indexOf(null);

    if (index > -1) {
      // Already selected, remove it
      currentSelection.splice(index, 1);
    } else {
      // Not selected, add null to filter for CHOOSE_ACTION
      currentSelection.push(null);
    }

    this.actionsSelected.emit(currentSelection);
  }

  /**
   * Handle text filter input
   */
  onTextFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.textFilterChanged.emit(value);
  }

  /**
   * Calculate statistics for recommendations (fields without action but with recommendations)
   */
  private calculateRecommendationStatistics(): void {
    // Filter fields that have recommendations but no action set
    const fieldsWithRecommendations = this.fields.filter(field => {
      const hasRecommendation = RecommendationHelper.hasRecommendation(field);
      const hasNoAction = !field.action;
      return hasRecommendation && hasNoAction;
    });

    this.totalFieldsWithRecommendations = fieldsWithRecommendations.length;

    // Count recommendations by action type
    const recommendationCounts = new Map<MappingAction, number>();

    fieldsWithRecommendations.forEach(field => {
      const recommendations = RecommendationHelper.getRecommendations(field);
      // Count the first (primary) recommendation
      if (recommendations.length > 0 && recommendations[0].action) {
        const action = recommendations[0].action as MappingAction;
        const currentCount = recommendationCounts.get(action) || 0;
        recommendationCounts.set(action, currentCount + 1);
      }
    });

    // Create statistics array
    this.recommendationStatistics = [];
    const actionsToDisplay: MappingAction[] = ['use', 'use_recursive', 'not_use', 'empty', 'copy_from', 'copy_to', 'fixed', 'manual'];

    actionsToDisplay.forEach(action => {
      const count = recommendationCounts.get(action) || 0;
      if (count > 0) {
        this.recommendationStatistics.push({
          action,
          count,
          icon: this.getActionIcon(action),
          label: this.getActionLabel(action),
          cssClass: this.getRecommendationCssClass(action)
        });
      }
    });

    // Sort by count (descending)
    this.recommendationStatistics.sort((a, b) => b.count - a.count);
  }

  /**
   * Gets the CSS class for a recommendation badge
   */
  private getRecommendationCssClass(action: MappingAction): string {
    return `recommendation-chip--${action}`;
  }

  /**
   * Handle click on recommendation badge - toggle selection
   */
  onRecommendationClick(action: MappingAction): void {
    const currentSelection = [...this.selectedRecommendations];
    const index = currentSelection.indexOf(action);

    if (index > -1) {
      // Recommendation is selected, remove it
      currentSelection.splice(index, 1);
    } else {
      // Recommendation is not selected, add it
      currentSelection.push(action);
    }

    this.recommendationsSelected.emit(currentSelection);
  }

  /**
   * Clear all recommendation filters
   */
  clearRecommendationFilter(): void {
    this.recommendationsSelected.emit([]);
  }

  /**
   * Get tooltip for recommendation
   */
  getRecommendationTooltip(stat: RecommendationStatistic): string {
    const baseText = `${stat.count} Feld${stat.count !== 1 ? 'er' : ''} mit Empfehlung "${stat.label}"`;
    const action = this.isRecommendationActive(stat.action) ? 'Klicken zum Abwählen' : 'Klicken zum Filtern';
    return `${baseText}. ${action}.`;
  }

  /**
   * Check if recommendation badge is active
   */
  isRecommendationActive(action: MappingAction): boolean {
    return this.selectedRecommendations.includes(action);
  }

  /**
   * Check if any filters are active
   */
  hasAnyFilters(): boolean {
    return this.selectedActions.length > 0 || this.selectedRecommendations.length > 0;
  }

  /**
   * Clear all filters (actions and recommendations)
   */
  clearAllFilters(): void {
    this.actionsSelected.emit([]);
    this.recommendationsSelected.emit([]);
  }
}
