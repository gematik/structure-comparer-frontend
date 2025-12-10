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
import { Component, EventEmitter, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { BaseMappingTableComponent, SourceFieldOption } from '../base-mapping-table/base-mapping-table.component';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { FilterableFieldSelectComponent, FilterableFieldOption } from '../filterable-field-select/filterable-field-select.component';
import { MappingAction } from '../../models/mapping.model';

/**
 * UI model for a value mapping row (target-centric)
 */
export interface ValueMappingRow {
  targetField: string;
  targetName: string;
  targetPath: string;
  action: MappingAction | null;
  copyFromSource: string | null;
  originalAction: MappingAction | null;
  originalCopyFromSource: string | null;
  hasChildren: boolean;
  depth: number;
  isValueXField: boolean;
  /** Target cardinality min value */
  cardinalityMin: number | string | null;
  /** Target cardinality max value */
  cardinalityMax: number | string | null;
}

@Component({
  selector: 'app-value-mapping-table',
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
    FilterableFieldSelectComponent
  ],
  templateUrl: './value-mapping-table.component.html',
  styleUrls: ['./value-mapping-table.component.css']
})
export class ValueMappingTableComponent extends BaseMappingTableComponent<ValueMappingRow> {

  /** Emitted when a value row's copyFromSource changes */
  @Output() copyFromChanged = new EventEmitter<{ index: number; sourceField: string | null }>();

  override filteredRows: ValueMappingRow[] = [];

  /** Cached source field options for the filterable select component */
  sourceFieldOptions: FilterableFieldOption[] = [];

  /**
   * Override ngOnChanges to update cached options when sourceFields change
   */
  override ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes['sourceFields']) {
      this.updateSourceFieldOptions();
    }
  }

  /**
   * Update cached source field options
   */
  private updateSourceFieldOptions(): void {
    this.sourceFieldOptions = this.sourceFields.map(source => ({
      name: source.name,
      displayName: source.displayName,
      cardinalityMin: source.cardinalityMin,
      cardinalityMax: source.cardinalityMax,
      additionalInfo: source.unresolvedReference
        ? `⚠️ Nicht aufgelöstes Profil: ${this.extractProfileName(source.unresolvedReference)}`
        : undefined
    }));
  }

  /**
   * Extract a readable profile name from a URL
   */
  private extractProfileName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] || url;
  }

  /**
   * Get filtered source fields (excludes fields with max cardinality of 0)
   */
  get availableSourceFields(): SourceFieldOption[] {
    return this.sourceFields.filter(source => {
      const maxCard = source.cardinalityMax;
      // Exclude if max is exactly 0 (as number or string)
      if (maxCard === 0 || maxCard === '0') {
        return false;
      }
      return true;
    });
  }

  /**
   * Serialize value mappings for change comparison
   */
  protected override serializeForComparison(): string {
    return JSON.stringify(this.rows.map(v => ({
      action: v.action,
      copyFromSource: v.copyFromSource
    })));
  }

  /**
   * Apply value type and text filter
   */
  protected override applyFilter(): void {
    let filtered = this.rows;

    // Filter out fields with max cardinality of 0
    filtered = filtered.filter(v => {
      const maxCard = v.cardinalityMax;
      // Exclude if max is exactly 0 (as number or string)
      if (maxCard === 0 || maxCard === '0') {
        return false;
      }
      return true;
    });

    // Apply type filter (only show value[x] type fields when enabled)
    if (this.filterEnabled) {
      filtered = filtered.filter(v => v.isValueXField);
    }

    // Apply text filter
    if (this.textFilter.trim()) {
      const searchTerm = this.textFilter.toLowerCase().trim();
      filtered = filtered.filter(v => {
        return v.targetField.toLowerCase().includes(searchTerm) ||
               v.targetName.toLowerCase().includes(searchTerm) ||
               v.targetPath.toLowerCase().includes(searchTerm) ||
               (v.copyFromSource?.toLowerCase().includes(searchTerm));
      });
    }

    this.filteredRows = filtered;
  }

  /**
   * Called when a copy_value_from source is selected for a value row
   */
  onValueCopyFromChanged(index: number, sourceField: string | null): void {
    const row = this.findRowByFilteredIndex(index);
    if (!row) return;

    row.copyFromSource = sourceField || null;
    if (sourceField) {
      row.action = 'copy_value_from';
    } else {
      row.action = null;
    }

    this.copyFromChanged.emit({ index, sourceField: sourceField || null });
    this.emitRowChanges();
  }

  /**
   * Get indent style for nested value fields
   */
  getIndentStyle(depth: number): { [key: string]: string } {
    return {
      'padding-left': `${depth * 20}px`
    };
  }

  /**
   * Format cardinality as string (e.g., "0..1", "1..*")
   */
  getCardinalityDisplay(row: ValueMappingRow): string {
    const min = row.cardinalityMin ?? '?';
    const max = row.cardinalityMax ?? '?';
    return `${min}..${max}`;
  }

  /**
   * Format source field cardinality as string (e.g., "0..1", "1..*")
   */
  getSourceCardinalityDisplay(source: SourceFieldOption): string {
    const min = source.cardinalityMin ?? '?';
    const max = source.cardinalityMax ?? '?';
    return `${min}..${max}`;
  }

  /**
   * Find the original row from filtered index
   */
  private findRowByFilteredIndex(filteredIndex: number): ValueMappingRow | null {
    const filteredRow = this.filteredRows[filteredIndex];
    if (!filteredRow) return null;
    return this.rows.find(r => r.targetField === filteredRow.targetField) || null;
  }
}
