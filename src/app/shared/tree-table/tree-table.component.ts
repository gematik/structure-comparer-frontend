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
import { buildPropertyTree, filterTreeWithParents } from '../mapping-tree.util';
import { FilterSettingsComponent, FilterSettings } from '../filter-settings/filter-settings.component';
import { MappingField, MappingAction } from '../../models/mapping.model';
import {
  MappingTextHelper,
  StatusHelper,
  CardinalityHelper,
  ACTION_CSS,
} from '../../mapping-detail/mapping-detail-helpers';
import { MappingStatus } from '../../models/mapping-evaluation.model';
import { MappingActionDisplayComponent } from '../mapping-action-display/mapping-action-display.component';
import { MappingStatusDisplayComponent } from '../mapping-status-display/mapping-status-display.component';

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
    MatSortModule,
    MappingActionDisplayComponent,
    MappingStatusDisplayComponent
  ],
  templateUrl: './tree-table.component.html',
  styleUrls: ['./tree-table.component.css']
})
export class TreeTableComponent implements OnInit, OnChanges {
  @Input() fields: MappingField[] = [];
  @Input() config: TreeTableConfig = { profileColumns: [] };
  @Input() filterSettings: FilterSettings = { showParentNodes: true };
  @Input() currentQuickFilter: MappingStatus | null = null;
  @Input() currentActionFilter: MappingAction[] = [];
  @Input() availableFields: any[] = [];
  @Input() classifications: any[] = [];
  @Input() editingIndex: number | null = null;
  @Input() hoverIndex: number | null = null;
  @Input() textFilter: string = '';

  @Output() editField = new EventEmitter<EditFieldEvent>();
  @Output() confirmChanges = new EventEmitter<any>();
  @Output() startHover = new EventEmitter<number>();
  @Output() stopHover = new EventEmitter<void>();
  @Output() sortChange = new EventEmitter<any>();
  @Output() applyRecommendation = new EventEmitter<{ field: any; index: number; event: Event }>();

  propertyTree: PropertyTreeNode[] = [];
  filteredTree: PropertyTreeNode[] = [];
  isExpandedById: Record<string, boolean> = {};
  visibleRows: DisplayRow[] = [];

  ngOnInit(): void {
    this.buildTree();
    this.updateVisibleRows();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields'] || changes['currentQuickFilter'] || changes['currentActionFilter'] || changes['textFilter'] || changes['filterSettings']) {
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

    // Save current expansion states before rebuilding
    const savedExpansionStates = { ...this.isExpandedById };

    this.propertyTree = buildPropertyTree(this.fields);
    this.filteredTree = [...this.propertyTree];

    // Initialize expansion states - root nodes expanded by default
    // But preserve existing states for nodes that still exist
    this.initializeExpansionStates(this.propertyTree, true);

    // Restore saved expansion states for nodes that still exist
    Object.keys(savedExpansionStates).forEach(nodeId => {
      if (this.isExpandedById.hasOwnProperty(nodeId)) {
        this.isExpandedById[nodeId] = savedExpansionStates[nodeId];
      }
    });

    // Update visible rows after building tree
    this.updateVisibleRows();
  }

  /**
   * Apply current filter to the tree
   */
  applyFilter(): void {
    // Build tree from all fields first
    const fullTree = buildPropertyTree(this.fields);

    // Check if any filters are active
    const hasQuickFilter = !!this.currentQuickFilter;
    const hasActionFilter = this.currentActionFilter.length > 0;
    const hasTextFilter = this.textFilter && this.textFilter.trim().length > 0;
    const hasAnyFilter = hasQuickFilter || hasActionFilter || hasTextFilter;

    if (!hasAnyFilter) {
      // No filters active - show full tree
      this.filteredTree = fullTree;
      this.initializeExpansionStates(this.filteredTree, true);
      this.updateVisibleRows();
      return;
    }

    // Apply filters using filterTreeWithParents
    const filterFn = (node: PropertyTreeNode): boolean => {
      if (!node.originalField) return false;

      const field = node.originalField;

      // Apply quick filter
      if (hasQuickFilter) {
        const fieldStatus = this.getFieldStatus(field);
        if (fieldStatus !== this.currentQuickFilter) {
          return false;
        }
      }

      // Apply action filter
      if (hasActionFilter) {
        if (!field.action || !this.currentActionFilter.includes(field.action)) {
          return false;
        }
      }

      // Apply text filter
      if (hasTextFilter) {
        const normalizedFilter = this.normalizeString(this.textFilter);
        const name = this.normalizeString(field.name || '');
        const action = this.normalizeString(field.action || '');
        const remark = this.normalizeString(field.remark || '');
        const status = this.normalizeString(this.getStatusLabel(this.getFieldStatus(field)));

        if (!name.includes(normalizedFilter) &&
            !action.includes(normalizedFilter) &&
            !remark.includes(normalizedFilter) &&
            !status.includes(normalizedFilter)) {
          return false;
        }
      }

      return true;
    };

    // Determine whether to include parent nodes:
    // - Only include if showParentNodes is enabled
    // - AND we have status/action filters (not for text filter)
    const includeParents = this.filterSettings.showParentNodes && (hasQuickFilter || hasActionFilter);

    // Apply filter with or without parent nodes
    this.filteredTree = filterTreeWithParents(
      fullTree,
      filterFn,
      includeParents
    );

    // Expand nodes based on filter type
    if (hasTextFilter || hasQuickFilter || hasActionFilter) {
      // Expand all nodes to show filtered results
      this.expandNodesRecursive(this.filteredTree);
    } else {
      // Only expand root level
      this.initializeExpansionStates(this.filteredTree, true);
    }

    // Update visible rows after filtering
    this.updateVisibleRows();
  }

  /**
   * Normalizes a string for filtering
   */
  private normalizeString(str: string): string {
    return str.toLowerCase().trim();
  }

  /**
   * Gets visible tree rows for table display
   */
  getVisibleTreeRows(): DisplayRow[] {
    return this.visibleRows;
  }

  /**
   * Updates the cached visible rows based on current expansion states
   */
  private updateVisibleRows(): void {
    const visibleRows: DisplayRow[] = [];

    const traverse = (node: PropertyTreeNode, depth = 0, parentExpanded = true) => {
      if (parentExpanded) {
        const hasChildren = !!(node.children && node.children.length > 0);

        const displayRow: DisplayRow = {
          node: node,
          field: node.originalField,
          depth: depth,
          isLeaf: node.isLeaf || false,
          hasChildren: hasChildren
        };

        visibleRows.push(displayRow);

        // Check if this node is expanded and has children
        const nodeExpanded = this.isExpanded(node);
        if (hasChildren && nodeExpanded) {
          node.children!.forEach(child =>
            traverse(child, depth + 1, true)
          );
        }
      }
    };

    this.filteredTree.forEach(node => traverse(node));
    this.visibleRows = visibleRows;
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

      // Update visible rows after toggling
      this.updateVisibleRows();
    }
  }

  /**
   * Handles click on entire tree cell (label, icon, etc.)
   */
  handleTreeCellClick(row: DisplayRow, event: MouseEvent): void {
    if (row.hasChildren) {
      this.toggleNode(row.node);
      event.stopPropagation();
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
    this.updateVisibleRows();
  }

  /**
   * Collapses all tree nodes
   */
  collapseAllNodes(): void {
    this.collapseNodesRecursive(this.filteredTree);
    this.updateVisibleRows();
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

  /**
   * Saves the current expansion state
   */
  saveExpansionState(): Record<string, boolean> {
    return { ...this.isExpandedById };
  }

  /**
   * Restores a previously saved expansion state
   */
  restoreExpansionState(savedState: Record<string, boolean>): void {
    this.isExpandedById = { ...savedState };
    this.updateVisibleRows();
  }

  // Helper methods - these should match the parent component's implementation

  getFieldStatus(field: MappingField): MappingStatus {
    return StatusHelper.getFieldStatus(field);
  }

  getStatusLabel(status: MappingStatus): string {
    return StatusHelper.getLabelForStatus(status);
  }
  
  getFieldStatusLabel(field: MappingField): string {
    return StatusHelper.getFieldStatusLabel(field);
  }

  getStatusCssClass(status: MappingStatus): string {
    return StatusHelper.getClassForStatus(status);
  }
  
  getFieldStatusCssClass(field: MappingField): string {
    return StatusHelper.getFieldStatusClass(field);
  }

  getStatusTooltip(field: MappingField): string {
    return StatusHelper.getFieldStatusTooltip(field).join('\n');
  }

  getClassificationCssClass(action: string): string {
    return ACTION_CSS[action as keyof typeof ACTION_CSS] || '';
  }

  formatCardinality = CardinalityHelper.formatCardinality;

  getCardinalityStyle = CardinalityHelper.getCardinalityStyle;

  getConsolidatedMappingText(field: MappingField): string {
    return MappingTextHelper.buildActionLabel(field.action_info, field.action);
  }

  getActionSubLabel(field: MappingField): string | null {
    return MappingTextHelper.buildActionSubLabel(field.action_info);
  }

  getRemarkTooltip(field: MappingField): string | null {
    return MappingTextHelper.buildActionTooltip(field.action_info);
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
    const localMatch = this.localHoverIndex === index;
    const parentMatch = this.hoverIndex === index;
    const result = localMatch || parentMatch;

    console.log(`TreeTable isHovering(${index}):`, {
      localHoverIndex: this.localHoverIndex,
      parentHoverIndex: this.hoverIndex,
      localMatch,
      parentMatch,
      result
    });

    return result;
  }

  onSortChange(event: any): void {
    this.sortChange.emit(event);
  }

  /**
   * Handle apply recommendation event from child component
   */
  onApplyRecommendation(event: { field: any; index: number; event: Event }): void {
    this.applyRecommendation.emit(event);
  }

  /**
   * Gets tooltip text for profile references
   */
  getRefTooltip(field: any, profileKey: string): string {
    const fp = field.profiles?.[profileKey];
    if (!fp?.ref_types?.length) {
      return 'Keine Referenz-Typen definiert';
    }
    return `Referenz-Typen: ${fp.ref_types.join(', ')}`;
  }

  /**
   * Checks if there are reference differences across profiles
   */
  hasRefDifferences(field: any): boolean {
    const allRefs = this.config.profileColumns
      .map(p => field.profiles?.[p.key]?.ref_types || [])
      .filter(refs => refs.length > 0);

    if (allRefs.length <= 1) return false;

    const firstRefs = allRefs[0].sort().join(',');
    return allRefs.some(refs => refs.sort().join(',') !== firstRefs);
  }
}
