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
import { Directive, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

/**
 * Base interface for source field options in dropdowns
 */
export interface SourceFieldOption {
  name: string;
  displayName: string;
  profileKey: string;
  /** Source cardinality min value */
  cardinalityMin?: number | string | null;
  /** Source cardinality max value */
  cardinalityMax?: number | string | null;
}

/**
 * Base abstract component for mapping tables (Resource and Value mappings)
 * Provides common functionality for filtering, change detection, and save operations
 */
@Directive()
export abstract class BaseMappingTableComponent<TRow, TFiltered = TRow> implements OnChanges {
  /** All mapping rows (unfiltered) */
  @Input() rows: TRow[] = [];

  /** Available source field options for dropdowns */
  @Input() sourceFields: SourceFieldOption[] = [];

  /** Toggle filter enabled state */
  @Input() filterEnabled = true;

  /** Text filter value */
  @Input() textFilter = '';

  /** Emitted when filter toggle changes */
  @Output() filterToggleChange = new EventEmitter<boolean>();

  /** Emitted when text filter changes */
  @Output() textFilterChange = new EventEmitter<string>();

  /** Emitted when save is requested */
  @Output() saveRequested = new EventEmitter<void>();

  /** Emitted when row data changes */
  @Output() rowsChange = new EventEmitter<TRow[]>();

  /** Filtered rows for display */
  filteredRows: TFiltered[] = [];

  /** Original state for change detection */
  protected originalState = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows'] || changes['filterEnabled'] || changes['textFilter']) {
      this.applyFilter();
    }
    if (changes['rows'] && changes['rows'].firstChange) {
      this.storeOriginalState();
    }
  }

  /**
   * Store the original state for change detection
   */
  protected storeOriginalState(): void {
    this.originalState = this.serializeForComparison();
  }

  /**
   * Serialize rows for comparison (override in subclasses)
   */
  protected abstract serializeForComparison(): string;

  /**
   * Apply filter logic (override in subclasses)
   */
  protected abstract applyFilter(): void;

  /**
   * Check if there are unsaved changes
   */
  hasChanges(): boolean {
    return this.serializeForComparison() !== this.originalState;
  }

  /**
   * Called when filter toggle changes
   */
  onFilterToggleChange(enabled: boolean): void {
    this.filterEnabled = enabled;
    this.filterToggleChange.emit(enabled);
    this.applyFilter();
  }

  /**
   * Called when text filter changes
   */
  onTextFilterChange(text: string): void {
    this.textFilter = text;
    this.textFilterChange.emit(text);
    this.applyFilter();
  }

  /**
   * Request save operation
   */
  onSave(): void {
    this.saveRequested.emit();
  }

  /**
   * Emit row changes to parent
   */
  protected emitRowChanges(): void {
    this.rowsChange.emit([...this.rows]);
  }
}
