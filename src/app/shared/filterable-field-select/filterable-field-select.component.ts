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
import { Component, EventEmitter, Input, OnChanges, OnInit, OnDestroy, Output, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

/**
 * Interface for field options in the filterable select
 */
export interface FilterableFieldOption {
  /** The field name/path (used as value) */
  name: string;
  /** Optional display name (if different from name) */
  displayName?: string;
  /** Optional cardinality min */
  cardinalityMin?: number | string | null;
  /** Optional cardinality max */
  cardinalityMax?: number | string | null;
  /** Optional additional info to display */
  additionalInfo?: string;
}

/**
 * A reusable component for filterable field selection with autocomplete.
 * Supports text-based filtering, cardinality display, and automatic filtering
 * of fields with max cardinality of 0.
 */
@Component({
  selector: 'app-filterable-field-select',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './filterable-field-select.component.html',
  styleUrls: ['./filterable-field-select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterableFieldSelectComponent implements OnInit, OnChanges, OnDestroy {

  /** Label for the input field */
  @Input() label = 'Feld auswählen';

  /** Placeholder text */
  @Input() placeholder = 'Feldname eingeben oder auswählen...';

  /** Hint text shown below the input */
  @Input() hint = 'Beginnen Sie zu tippen, um zu filtern';

  /** All available field options */
  @Input() options: FilterableFieldOption[] = [];

  /** Currently selected value */
  @Input() value: string | null = null;

  /** Whether the field is required */
  @Input() required = false;

  /** Whether to show cardinality badges */
  @Input() showCardinality = true;

  /** Whether to filter out options with max cardinality of 0 */
  @Input() filterZeroCardinality = true;

  /** Error message to display when invalid */
  @Input() errorMessage = 'Bitte wählen Sie ein Feld aus';

  /** Emitted when value changes */
  @Output() valueChange = new EventEmitter<string | null>();

  /** Emitted when selection is cleared */
  @Output() cleared = new EventEmitter<void>();

  /** The current input/search value */
  inputValue = '';

  /** Filtered options based on search */
  filteredOptions: FilterableFieldOption[] = [];

  /** Cached available options (after zero-cardinality filtering) */
  private cachedAvailableOptions: FilterableFieldOption[] = [];

  /** Subject for debounced input changes */
  private inputSubject = new Subject<string>();

  /** Destroy subject for cleanup */
  private destroy$ = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.inputValue = this.value || '';
    this.updateCachedOptions();
    this.applyFilter();

    // Setup debounced filtering
    this.inputSubject.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.applyFilter();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['filterZeroCardinality']) {
      this.updateCachedOptions();
      this.applyFilter();
    }
    if (changes['value'] && !changes['value'].firstChange) {
      this.inputValue = this.value || '';
    }
  }

  /**
   * Cache the available options to avoid recalculating on every filter
   */
  private updateCachedOptions(): void {
    if (!this.filterZeroCardinality) {
      this.cachedAvailableOptions = this.options;
      return;
    }

    this.cachedAvailableOptions = this.options.filter(option => {
      const maxCard = option.cardinalityMax;
      return maxCard !== 0 && maxCard !== '0';
    });
  }

  /**
   * Apply text filter to options
   */
  applyFilter(): void {
    const query = this.inputValue.trim().toLowerCase();

    if (!query) {
      this.filteredOptions = this.cachedAvailableOptions;
      return;
    }

    this.filteredOptions = this.cachedAvailableOptions.filter(option => {
      const nameMatch = option.name.toLowerCase().includes(query);
      const displayMatch = option.displayName?.toLowerCase().includes(query);
      return nameMatch || displayMatch;
    });
  }

  /**
   * Called when input value changes
   */
  onInputChange(value: string): void {
    this.inputValue = value;
    this.inputSubject.next(value);

    // Emit immediately for exact matches or empty
    if (value === '') {
      this.valueChange.emit(null);
    } else {
      const exactMatch = this.cachedAvailableOptions.find(
        opt => opt.name === value || opt.displayName === value
      );
      if (exactMatch) {
        this.valueChange.emit(exactMatch.name);
      }
    }
  }

  /**
   * Called when an option is selected from autocomplete
   */
  onOptionSelected(optionName: string): void {
    this.inputValue = optionName;
    this.valueChange.emit(optionName);
  }

  /**
   * Clear the selection
   */
  clear(): void {
    this.inputValue = '';
    this.valueChange.emit(null);
    this.cleared.emit();
    this.applyFilter();
  }

  /**
   * Format cardinality as string (e.g., "0..1", "1..*")
   */
  getCardinalityDisplay(option: FilterableFieldOption): string {
    if (!this.showCardinality) return '';
    const min = option.cardinalityMin ?? '?';
    const max = option.cardinalityMax ?? '?';
    return `${min}..${max}`;
  }

  /**
   * Check if an option has valid cardinality info
   */
  hasCardinality(option: FilterableFieldOption): boolean {
    return option.cardinalityMin !== undefined || option.cardinalityMax !== undefined;
  }

  /**
   * Get display text for an option
   */
  getDisplayText(option: FilterableFieldOption): string {
    return option.displayName || option.name;
  }
}
