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
 */
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { BaseMappingTableComponent, SourceFieldOption } from '../base-mapping-table/base-mapping-table.component';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { FilterableSelectComponent, SelectableOption } from '../filterable-field-select/filterable-field-select.component';
import { Mapping } from '../../models/mapping.model';

/**
 * A single source mapping entry (source resource + mapping)
 */
export interface SourceMappingEntry {
  sourceField: string | null;
  sourceName: string | null;
  mappingId: string | null;
  mappingName: string | null;
}

/**
 * UI model for a resource mapping row (target-centric)
 */
export interface ResourceMappingRow {
  targetField: string;
  targetName: string;
  sourceMappings: SourceMappingEntry[];
  originalSourceMappings: SourceMappingEntry[];
  isResourceField: boolean;
  isValueXField?: boolean;
  targetCardinalityMin?: number | string | null;
  targetCardinalityMax?: number | string | null;
}

@Component({
  selector: 'app-resource-mapping-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    FilterBarComponent,
    FilterableSelectComponent
  ],
  templateUrl: './resource-mapping-table.component.html',
  styleUrls: ['./resource-mapping-table.component.css']
})
export class ResourceMappingTableComponent extends BaseMappingTableComponent<ResourceMappingRow> {

  /** Available mappings for dropdown selection */
  @Input() availableMappings: Mapping[] = [];

  /** Emitted when user wants to view a mapping */
  @Output() viewMappingRequested = new EventEmitter<string>();

  override filteredRows: ResourceMappingRow[] = [];

  /** Cached source field options for the filterable select */
  sourceFieldOptions: SelectableOption[] = [];

  /** Cached mapping options for the mapping select */
  mappingOptions: SelectableOption[] = [];

  /**
   * Override ngOnChanges to update cached options when inputs change
   */
  override ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes['sourceFields']) {
      this.updateSourceFieldOptions();
    }
    if (changes['availableMappings']) {
      this.updateMappingOptions();
    }
  }

  /**
   * Update cached source field options
   */
  private updateSourceFieldOptions(): void {
    this.sourceFieldOptions = this.sourceFields.map(source => ({
      value: source.name,
      label: source.displayName || source.name,
      secondaryLabel: source.name !== source.displayName ? source.name : undefined
    }));
  }

  /**
   * Update cached mapping options
   */
  private updateMappingOptions(): void {
    this.mappingOptions = this.availableMappings.map(m => ({
      value: m.id,
      label: m.name
    }));
  }

  /**
   * Serialize resource mappings for change comparison
   */
  protected override serializeForComparison(): string {
    return JSON.stringify(this.rows.map(r => ({
      sourceMappings: r.sourceMappings
    })));
  }

  /**
   * Apply resource type and text filter
   */
  protected override applyFilter(): void {
    let filtered = this.rows;

    // Apply type filter (only show Resource type fields when enabled)
    if (this.filterEnabled) {
      filtered = filtered.filter(row => row.isResourceField);
    }

    // Apply text filter
    if (this.textFilter.trim()) {
      const searchTerm = this.textFilter.toLowerCase().trim();
      filtered = filtered.filter(row => {
        // Check target field name
        const targetMatches = row.targetField.toLowerCase().includes(searchTerm) ||
                              row.targetName.toLowerCase().includes(searchTerm);

        // Check source field names
        const sourceMatches = row.sourceMappings.some(s =>
          (s.sourceField?.toLowerCase().includes(searchTerm)) ||
          (s.sourceName?.toLowerCase().includes(searchTerm))
        );

        return targetMatches || sourceMatches;
      });
    }

    this.filteredRows = filtered;
  }

  /**
   * Called when a source resource is selected for a target row's source entry
   */
  onSourceResourceChanged(rowIndex: number, sourceIndex: number, sourceField: string | null): void {
    const row = this.findRowByFilteredIndex(rowIndex);
    if (!row) return;

    const entry = row.sourceMappings[sourceIndex];
    entry.sourceField = sourceField;
    if (sourceField) {
      const parts = sourceField.split('.');
      const entryPart = parts.find(p => p.startsWith('entry:'));
      entry.sourceName = entryPart ? entryPart.replace('entry:', '') : sourceField;
    } else {
      entry.sourceName = null;
    }
    this.emitRowChanges();
  }

  /**
   * Called when a mapping is selected for a source entry
   */
  onResourceMappingChanged(rowIndex: number, sourceIndex: number, mappingId: string | null): void {
    const row = this.findRowByFilteredIndex(rowIndex);
    if (!row) return;

    const entry = row.sourceMappings[sourceIndex];
    entry.mappingId = mappingId;
    if (mappingId) {
      const mapping = this.availableMappings.find(m => m.id === mappingId);
      entry.mappingName = mapping?.name || null;
    } else {
      entry.mappingName = null;
    }
    this.emitRowChanges();
  }

  /**
   * Add a new source mapping entry to a target resource row
   */
  addSourceMapping(rowIndex: number): void {
    const row = this.findRowByFilteredIndex(rowIndex);
    if (!row) return;

    row.sourceMappings.push({
      sourceField: null,
      sourceName: null,
      mappingId: null,
      mappingName: null
    });
    this.emitRowChanges();
  }

  /**
   * Remove a source mapping entry from a target resource row
   */
  removeSourceMapping(rowIndex: number, sourceIndex: number): void {
    const row = this.findRowByFilteredIndex(rowIndex);
    if (!row) return;

    const mappings = row.sourceMappings;
    if (mappings.length > 1) {
      mappings.splice(sourceIndex, 1);
    } else {
      // Keep at least one entry, just clear it
      mappings[0] = {
        sourceField: null,
        sourceName: null,
        mappingId: null,
        mappingName: null
      };
    }
    this.emitRowChanges();
  }

  /**
   * Check if a resource mapping row has any mapping assigned
   */
  hasAnyMapping(row: ResourceMappingRow): boolean {
    return row.sourceMappings.some(s => s.mappingId !== null);
  }

  /**
   * View a specific mapping
   */
  viewMapping(mappingId: string): void {
    this.viewMappingRequested.emit(mappingId);
  }

  /**
   * Find the original row from filtered index
   */
  private findRowByFilteredIndex(filteredIndex: number): ResourceMappingRow | null {
    const filteredRow = this.filteredRows[filteredIndex];
    if (!filteredRow) return null;
    return this.rows.find(r => r.targetField === filteredRow.targetField) || null;
  }
}
