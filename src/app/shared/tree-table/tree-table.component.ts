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
 */

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

import { MatTooltip } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { PropertyTreeNode } from '../../models/property-tree-node.model';
import { buildPropertyTree, filterTreeNodes } from '../mapping-tree.util';
import { MappingEvaluation } from '../../models/mapping-evaluation.model';

export interface DisplayRow {
  node: PropertyTreeNode;
  field?: any; // original field data for leaf nodes
  depth: number;
  isLeaf: boolean;
  hasChildren: boolean;
}

export interface TreeTableConfig {
  profileColumns: Array<{ key: string; name: string; url?: string }>;
}

export interface EditFieldEvent {
  field: any;
  index: number;
}

@Component({
  selector: 'app-tree-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,

    MatTooltip,
    MatSortModule
  ],
  templateUrl: './tree-table.component.html',
  styleUrls: ['./tree-table.component.css']
})
export class TreeTableComponent implements OnInit, OnChanges {
  @Input() fields: any[] = [];
  @Input() config: TreeTableConfig = { profileColumns: [] };
  @Input() mappingEvaluation: MappingEvaluation | null = null;
  @Input() currentQuickFilter: string | null = null;
  @Input() availableFields: any[] = [];
  @Input() classifications: any[] = [];
  @Input() editingIndex: number | null = null;
  @Input() hoverIndex: number | null = null;

  @Output() editField = new EventEmitter<EditFieldEvent>();
  @Output() confirmChanges = new EventEmitter<any>();
  @Output() startHover = new EventEmitter<number>();
  @Output() stopHover = new EventEmitter<void>();
  @Output() sortChange = new EventEmitter<any>();

  propertyTree: PropertyTreeNode[] = [];
  filteredTree: PropertyTreeNode[] = [];
  isExpandedById: Record<string, boolean> = {};

  ngOnInit(): void {
    this.buildTree();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields'] || changes['currentQuickFilter']) {
      this.buildTree();
      this.applyFilter();
    }
  }

  /**
   * Builds the property tree from the current mapping fields
   */
  buildTree(): void {
    if (!this.fields || this.fields.length === 0) {
      this.propertyTree = [];
      this.filteredTree = [];
      return;
    }

    this.propertyTree = buildPropertyTree(this.fields);
    this.filteredTree = [...this.propertyTree];

    // Initialize expansion states - root nodes expanded by default
    this.initializeExpansionStates(this.propertyTree, true);
  }

  /**
   * Apply current filter to the tree
   */
  applyFilter(): void {
    if (!this.currentQuickFilter) {
      this.filteredTree = [...this.propertyTree];
      return;
    }

    // Filter the original fields first based on status
    const filteredFields = this.fields.filter(field => {
      const fieldStatus = this.getProcessingStatus(field);
      return fieldStatus === this.currentQuickFilter;
    });

    // Rebuild tree with filtered fields
    if (filteredFields.length > 0) {
      this.filteredTree = buildPropertyTree(filteredFields);
      // Re-initialize expansion states for filtered tree
      this.initializeExpansionStates(this.filteredTree, true);
    } else {
      this.filteredTree = [];
    }
  }

  /**
   * Gets visible tree rows for table display
   */
  getVisibleTreeRows(): DisplayRow[] {
    const visibleRows: DisplayRow[] = [];

    const traverse = (node: PropertyTreeNode, depth = 0, parentExpanded = true) => {
      if (parentExpanded) {
        const displayRow: DisplayRow = {
          node: node,
          field: node.originalField,
          depth: depth,
          isLeaf: node.isLeaf || false,
          hasChildren: (node.children && node.children.length > 0) || false
        };

        visibleRows.push(displayRow);

        // Check if this node is expanded
        const nodeExpanded = this.isExpanded(node);
        if (node.children && nodeExpanded) {
          node.children.forEach(child =>
            traverse(child, depth + 1, true)
          );
        }
      }
    };

    this.filteredTree.forEach(node => traverse(node));
    return visibleRows;
  }

  /**
   * Initializes expansion states for tree nodes
   */
  private initializeExpansionStates(nodes: PropertyTreeNode[], expanded = false): void {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        this.isExpandedById[node.id] = expanded;
        this.initializeExpansionStates(node.children, false); // Children start collapsed
      }
      if (node.children) {
        this.initializeExpansionStates(node.children, false);
      }
    });
  }

  /**
   * Toggles expansion state of a tree node
   */
  toggleNode(node: PropertyTreeNode): void {
    if (node.children && node.children.length > 0) {
      this.isExpandedById[node.id] = !this.isExpandedById[node.id];
    }
  }

  /**
   * Checks if a node is expanded
   */
  isExpanded(node: PropertyTreeNode): boolean {
    return this.isExpandedById[node.id] || false;
  }

  /**
   * Gets an array for depth visualization
   */
  getDepthArray(depth: number): any[] {
    return new Array(depth).fill(0);
  }

  /**
   * Expands all tree nodes
   */
  expandAllNodes(): void {
    this.expandNodesRecursive(this.filteredTree);
  }

  /**
   * Collapses all tree nodes
   */
  collapseAllNodes(): void {
    this.collapseNodesRecursive(this.filteredTree);
  }

  /**
   * Recursively expands nodes
   */
  private expandNodesRecursive(nodes: PropertyTreeNode[]): void {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        this.isExpandedById[node.id] = true;
        this.expandNodesRecursive(node.children);
      }
    });
  }

  /**
   * Recursively collapses nodes
   */
  private collapseNodesRecursive(nodes: PropertyTreeNode[]): void {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        this.isExpandedById[node.id] = false;
        this.collapseNodesRecursive(node.children);
      }
    });
  }

  // Helper methods - these should match the parent component's implementation

  getProcessingStatus(field: any): string {
    const evaluation = this.mappingEvaluation?.field_evaluations?.[field.name];

    if (evaluation) {
      const originalClassification = evaluation.original_classification;
      const action = evaluation.action;

      if (originalClassification === 'compatible' || originalClassification === 'warning') {
        return 'completed';
      } else if (originalClassification === 'incompatible' && action !== 'use') {
        return 'resolved';
      } else if (originalClassification === 'incompatible' && action === 'use') {
        return 'needs_action';
      }
    }

    // Fallback logic
    switch (field.classification) {
      case 'compatible':
        return 'completed';
      case 'warning':
        if (['extension', 'copy_from', 'copy_to', 'fixed', 'manual'].includes(field.action)) {
          return 'resolved';
        } else if (field.action === 'use') {
          return 'needs_action';
        } else {
          return 'in_progress';
        }
      case 'incompatible':
        if (['extension', 'copy_from', 'copy_to', 'fixed', 'not_use', 'empty'].includes(field.action)) {
          return 'resolved';
        } else {
          return 'needs_action';
        }
      default:
        return 'unknown';
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'completed': 'Kompatibel',
      'resolved': 'Gelöst',
      'needs_action': 'Aktion erforderlich'
    };
    return labels[status] || status;
  }

  getStatusCssClass(status: string): string {
    const cssClasses: { [key: string]: string } = {
      'completed': 'status-completed',
      'resolved': 'status-resolved',
      'needs_action': 'status-needs-action'
    };
    return cssClasses[status] || 'status-needs-action';
  }

  getStatusTooltip(field: any, status: string): string {
    const evaluation = this.mappingEvaluation?.field_evaluations?.[field.name];

    switch (status) {
      case 'completed':
        return 'Dieses Feld ist kompatibel und benötigt keine weiteren Aktionen.';
      case 'resolved':
        return `Problem wurde durch ${field.action} Aktion gelöst. ${evaluation?.issues?.length ? 'Details: ' + evaluation.issues.map((i: any) => i.message).join('; ') : ''}`;
      case 'needs_action':
        return `${field.classification === 'incompatible' ? 'Inkompatibilität' : 'Warnung'} erfordert eine Aktion zur Lösung.`;
      default:
        return 'Status unbekannt';
    }
  }

  getClassificationCssClass(action: string): string {
    const CSS_CLASS: { [key: string]: string } = {
      use: 'row-use',
      not_use: 'row-not-use',
      empty: 'row-empty',
      extension: 'row-extension',
      manual: 'row-manual',
      other: 'row-other',
      copy_from: 'row-copy-from',
      copy_to: 'row-copy-to',
      fixed: 'row-fixed',
      medication_service: 'row-medication-service',
    };
    return CSS_CLASS[action] || '';
  }

  formatCardinality(minVal: any, maxVal: any): string {
    const min = Number.isFinite(+minVal) ? +minVal : 0;
    const max = (maxVal === '*' || maxVal === '∞') ? '*' : (Number.isFinite(+maxVal) ? +maxVal : 0);
    return `${min} .. ${max}`;
  }

  private clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
  }

  getCardinalityStyle(minVal: any, maxVal: any): {[k: string]: string} {
    const min = Number.isFinite(+minVal) ? +minVal : 0;
    const maxIsStar = (maxVal === '*' || maxVal === '∞');
    const maxNum = maxIsStar ? 10 : (Number.isFinite(+maxVal) ? +maxVal : 0);

    const minN = 1 - (this.clamp(min, 0, 2) / 2);
    const maxN = (this.clamp(maxNum, 0, 10) / 10);
    const openness = this.clamp(0.5 * minN + 0.5 * maxN, 0, 1);
    const hue = Math.round(0 + openness * 130);

    const bg = `hsl(${hue}, 90%, 92%)`;
    const border = `hsl(${hue}, 65%, 45%)`;
    const text = `hsl(${hue}, 60%, 25%)`;

    return {
      backgroundColor: bg,
      color: text,
      borderColor: border
    };
  }

  getEnhancedCssClass(field: any): string {
    const evaluation = this.mappingEvaluation?.field_evaluations?.[field.name];
    if (evaluation) {
      return this.loadComparisonCSSProperty(evaluation.enhanced_classification);
    }
    return this.loadComparisonCSSProperty(field.classification);
  }

  getEnhancedTooltip(field: any): string {
    const evaluation = this.mappingEvaluation?.field_evaluations?.[field.name];
    if (evaluation) {
      // Return enhanced tooltip based on evaluation
      return this.getClassificationDescription(field);
    }
    return this.getClassificationDescription(field);
  }

  private loadComparisonCSSProperty(compatibility: string): string {
    const CSS_CLASS: { [key: string]: string } = {
      compatible: 'compatible',
      warning: 'warning',
      incompatible: 'incompatible',
      action_resolved: 'action_resolved',
      action_mitigated: 'action_mitigated',
    };
    return CSS_CLASS[compatibility] || '';
  }

  private getClassificationDescription(field: any): string {
    // Simplified tooltip - can be enhanced later
    return `Classification: ${field.classification}`;
  }

  getConsolidatedMappingText(field: any): string {
    const parts: string[] = [];

    switch (field.action) {
      case 'copy_from':
        if (field.other) {
          parts.push(`← Kopiert von: ${field.other}`);
        }
        break;
      case 'copy_to':
        if (field.other) {
          parts.push(`→ Kopiert zu: ${field.other}`);
        }
        break;
      case 'fixed':
        if (field.fixed) {
          parts.push(`Fester Wert: "${field.fixed}"`);
        }
        break;
      case 'manual':
        if (field.remark) {
          parts.push(`Manuell: ${field.remark}`);
        } else {
          parts.push('Manuelle Bearbeitung erforderlich');
        }
        break;
      case 'extension':
        if (field.remark) {
          parts.push(`Extension: ${field.remark}`);
        } else {
          parts.push('Extension-Behandlung');
        }
        break;
      case 'not_use':
        parts.push('Wird nicht verwendet');
        break;
      case 'empty':
        parts.push('Wird nicht befüllt');
        break;
      case 'use':
        parts.push('Wird direkt übernommen');
        break;
      case 'other':
        parts.push('Sonderbehandlung erforderlich');
        break;
      case 'medication_service':
        parts.push('Medikations-Service Integration');
        break;
    }

    return parts.join(' • ');
  }

  getRemarkTooltip(field: any): string {
    switch (field.action) {
      case 'use':
        return 'No action needed for this mapping';
      case 'not_use':
      case 'empty':
        return 'Information will be removed or left empty in this mapping';
      case 'extension':
      case 'manual':
        return 'Special action required for this mapping';
      case 'other':
      case 'medication_service':
        return 'Caution reference!';
      case 'copy_from':
        return `This field copies its value from the following field: ${field.other}`;
      case 'copy_to':
        return `This field copies its value into the following field: ${field.other}`;
      case 'fixed':
        return `This field has a fixed value: ${field.fixed}`;
      default:
        return 'No additional information';
    }
  }

  getDescriptionForMapping(useValue: string): string | undefined {
    return this.classifications.find(item => item.value === useValue)?.description;
  }

  getClassificationInstruction(action: string): string {
    const found = this.classifications.find((c: any) => c.value === action);
    return found ? found.description : '';
  }

  // Event handlers
  onEditPropertyAction(field: any, index: number): void {
    this.editField.emit({ field, index });
  }

  onConfirmChanges(field: any): void {
    this.confirmChanges.emit(field);
  }

  // Local hover state management
  localHoverIndex: number | null = null;

  onStartHover(index: number): void {
    this.localHoverIndex = index;
    this.startHover.emit(index);
  }

  onStopHover(): void {
    this.localHoverIndex = null;
    this.stopHover.emit();
  }

  isHovering(index: number): boolean {
    return this.localHoverIndex === index;
  }

  onSortChange(event: any): void {
    this.sortChange.emit(event);
  }
}
