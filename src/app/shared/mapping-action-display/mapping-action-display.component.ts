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
import { Component, Input, Output, EventEmitter, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule, MatTooltip } from '@angular/material/tooltip';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MappingAction, MappingField } from '../../models/mapping.model';
import { ActionInfo } from '../../models/mapping-evaluation.model';
import { RecommendationHelper } from '../../mapping-detail/mapping-detail-helpers';

@Component({
  selector: 'app-mapping-action-display',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatMenuModule],
  templateUrl: './mapping-action-display.component.html',
  styleUrl: './mapping-action-display.component.css'
})
export class MappingActionDisplayComponent implements OnDestroy {
  @Input() field!: MappingField;
  @Input() compact: boolean = false; // Für kompakte Darstellung in der Tabelle
  @Input() allFields?: MappingField[]; // Optional: Alle Felder für Typ-Lookup bei copy_value_from/copy_value_to
  @Output() applyRecommendation = new EventEmitter<{ field: MappingField; index: number; event: Event }>();
  @Output() editField = new EventEmitter<{ field: MappingField; event: Event }>();
  @Output() quickActionSelected = new EventEmitter<{ field: MappingField; action: MappingAction }>();
  @Output() menuVisibleChange = new EventEmitter<boolean>();

  @ViewChild('actionTooltip', { static: false }) actionTooltip?: MatTooltip;

  private activeHoverTrigger: MatMenuTrigger | null = null;
  private tooltipVisible = false;
  private menuVisible = false;
  private debugLogging = true;
  private isTriggerHovered = false;
  private isMenuHovered = false;

  ngOnDestroy(): void {
    this.cancelScheduledMenuClose();
  }

  getActionMenuClasses(action: MappingAction | null): string[] {
    const classes = ['allowed-action-item'];
    const suffix = action ? action : 'default';
    classes.push(`allowed-action-item--${suffix}`);
    return classes;
  }

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
   * Builds tooltip text listing all allowed actions
   */
  getChooseActionTooltip(): string {
    const allowedActions = this.field?.actions_allowed || [];
    if (!allowedActions.length) {
      return 'Mapping-Aktion bearbeiten';
    }

    const formatted = allowedActions.map(action => {
      const label = action ? action.toUpperCase() : 'CHOOSE_ACTION';
      const description = this.getActionDescription(action);
      return `${label} – ${description}`;
    });

    return `Erlaubte Aktionen:\n${formatted.join('\n')}`;
  }

  /**
   * Indicates whether allowed actions tooltip should be shown
   */
  shouldShowAllowedActionsTooltip(): boolean {
    return !this.field?.action && !!(this.field?.actions_allowed?.length);
  }

  hasAllowedActions(): boolean {
    return !!(this.field?.actions_allowed && this.field.actions_allowed.length > 0);
  }

  openAllowedActionsMenu(trigger: MatMenuTrigger, event?: Event): void {
    if (!this.hasAllowedActions() || this.field?.action) {
      this.logDebug('openAllowedActionsMenu aborted: no allowed actions or existing action', {
        hasAllowed: this.hasAllowedActions(),
        fieldAction: this.field?.action
      });
      return;
    }
    if (this.isMenuOpenForTrigger(trigger)) {
      this.cancelScheduledMenuClose();
      this.logDebug('openAllowedActionsMenu skipped: menu already open for trigger');
      return;
    }
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.cancelScheduledMenuClose();
    this.activeHoverTrigger = trigger;
    trigger.openMenu();
    this.setMenuVisibility(true);
    this.logDebug('openAllowedActionsMenu executed');
  }

  toggleAllowedActionsMenu(trigger: MatMenuTrigger, event: Event): void {
    if (!this.hasAllowedActions() || this.field?.action) {
      this.onEditField(event);
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    if (trigger.menuOpen) {
      trigger.closeMenu();
      this.setMenuVisibility(false);
      this.logDebug('toggleAllowedActionsMenu: closed via click');
    } else {
      this.openAllowedActionsMenu(trigger, event);
    }
  }

  onTriggerMouseEnter(trigger: MatMenuTrigger, event?: Event): void {
    this.isTriggerHovered = true;
    if (this.isMenuOpenForTrigger(trigger)) {
      this.logDebug('onTriggerMouseEnter: menu already open, skipping');
      return;
    }
    this.hideTooltip();
    this.openAllowedActionsMenu(trigger, event);
    this.logDebug('onTriggerMouseEnter: menu opened');
  }

  onTriggerMouseLeave(): void {
    this.isTriggerHovered = false;
    this.logDebug('onTriggerMouseLeave: no auto-close (handled by host/menu leave)');
  }

  onMenuMouseEnter(): void {
    this.isMenuHovered = true;
    this.logDebug('onMenuMouseEnter: holding menu open');
  }

  onMenuMouseLeave(event: MouseEvent): void {
    this.isMenuHovered = false;
    if (this.isInsideHost(event.relatedTarget)) {
      this.logDebug('onMenuMouseLeave: still inside host, skipping close');
      return;
    }
    this.logDebug('onMenuMouseLeave: closing');
    this.closeMenuImmediate();
  }

  onQuickActionMenuClick(action: MappingAction, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!action) {
      this.onEditField(event);
      return;
    }
    this.quickActionSelected.emit({ field: this.field, action });
    this.setMenuVisibility(false);
    this.logDebug('onQuickActionMenuClick: action emitted', { action });
  }

  onAllowedActionsMenuClosed(): void {
    this.activeHoverTrigger = null;
    this.setMenuVisibility(false);
    this.isTriggerHovered = false;
    this.isMenuHovered = false;
    this.logDebug('onAllowedActionsMenuClosed called');
  }

  onAllowedActionsMenuOpened(): void {
    // Treat a freshly opened menu as hovered so it stays open even before pointer moves
    this.isMenuHovered = true;
    this.logDebug('onAllowedActionsMenuOpened called');
  }

  private closeMenuImmediate(): void {
    this.activeHoverTrigger?.closeMenu();
    this.activeHoverTrigger = null;
    this.setMenuVisibility(false);
  }

  private cancelScheduledMenuClose(): void {
    // Timers were removed; method retained for compatibility/logs
    this.logDebug('cancelScheduledMenuClose: no timers to clear');
  }

  onHostMouseOver(event: MouseEvent): void {
    if (!this.shouldShowAllowedActionsTooltip()) {
      this.hideTooltip();
      return;
    }
    const target = event.target as HTMLElement | null;
    if (this.isChooseActionTrigger(target)) {
      this.hideTooltip();
    } else {
      this.showTooltip();
    }
  }

  onHostMouseLeave(event: MouseEvent): void {
    this.isTriggerHovered = false;
    this.hideTooltip();
    if (this.menuVisible) {
      this.logDebug('onHostMouseLeave: menu open, ignore (menu handles close)');
      return;
    }
    if (this.isInsideHost(event.relatedTarget)) {
      this.logDebug('onHostMouseLeave: still inside host, skipping close');
      return;
    }
    this.logDebug('onHostMouseLeave: closing');
    this.closeMenuImmediate();
  }

  private isInsideHost(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) {
      return false;
    }
    return !!target.closest('.mapping-action-display');
  }

  private isChooseActionTrigger(target: HTMLElement | null): boolean {
    if (!target) {
      return false;
    }
    const element = target.closest('.choose-action-btn, .action-chip--no-action');
    return !!element;
  }

  private showTooltip(): void {
    if (this.tooltipVisible) {
      return;
    }
    this.actionTooltip?.show();
    this.tooltipVisible = true;
  }

  private hideTooltip(): void {
    if (this.tooltipVisible) {
      this.actionTooltip?.hide(0);
      this.tooltipVisible = false;
    } else {
      this.actionTooltip?.hide(0);
    }
  }

  private setMenuVisibility(open: boolean): void {
    if (this.menuVisible === open) {
      return;
    }
    this.menuVisible = open;
    this.menuVisibleChange.emit(open);
    if (!open) {
      this.hideTooltip();
    }
    this.logDebug('setMenuVisibility', { open });
  }

  private isMenuOpenForTrigger(trigger: MatMenuTrigger): boolean {
    return this.menuVisible && this.activeHoverTrigger === trigger && !!trigger.menuOpen;
  }

  private logDebug(message: string, payload?: any): void {
    if (!this.debugLogging) {
      return;
    }
    const prefix = '[MappingActionDisplay]';
    if (payload !== undefined) {
      // eslint-disable-next-line no-console
      console.log(prefix, message, payload);
    } else {
      // eslint-disable-next-line no-console
      console.log(prefix, message);
    }
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
