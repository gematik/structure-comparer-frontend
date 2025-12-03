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
import { Component, EventEmitter, Input, OnChanges, OnInit, OnDestroy, Output, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef, ContentChild } from '@angular/core';
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
 * Generic interface for selectable options in the filterable select.
 * Can be extended for specific use cases.
 */
export interface SelectableOption {
  /** The unique value (used as selection value) */
  value: string;
  /** Display label for the option */
  label: string;
  /** Optional secondary label (e.g., full path, description) */
  secondaryLabel?: string;
  /** Optional group name for grouping options */
  group?: string;
  /** Optional badge text (e.g., cardinality "0..1", type info) */
  badge?: string;
  /** Optional additional info to display below the main label */
  additionalInfo?: string;
  /** Optional flag to exclude from selection (e.g., max cardinality = 0) */
  excluded?: boolean;
  /** Any additional data */
  data?: unknown;
}

/**
 * Legacy interface for backwards compatibility
 * @deprecated Use SelectableOption instead
 */
export interface FilterableFieldOption {
  name: string;
  displayName?: string;
  cardinalityMin?: number | string | null;
  cardinalityMax?: number | string | null;
  additionalInfo?: string;
}

/**
 * A reusable component for filterable selection with autocomplete.
 * Supports text-based filtering, badges, grouping, and custom templates.
 */
@Component({
  selector: 'app-filterable-select',
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
export class FilterableSelectComponent implements OnInit, OnChanges, OnDestroy {

  /** Label for the input field */
  @Input() label = 'Auswählen';

  /** Placeholder text */
  @Input() placeholder = 'Eingeben oder auswählen...';

  /** Hint text shown below the input */
  @Input() hint = '';

  /** All available options */
  @Input() options: SelectableOption[] = [];

  /** Currently selected value */
  @Input() value: string | null = null;

  /** Whether the field is required */
  @Input() required = false;

  /** Whether to show badges */
  @Input() showBadge = true;

  /** Whether to filter out excluded options */
  @Input() filterExcluded = true;

  /** Error message to display when invalid */
  @Input() errorMessage = 'Bitte wählen Sie einen Wert aus';

  /** Message when no results found */
  @Input() noResultsMessage = 'Keine Ergebnisse gefunden';

  /** Whether to allow free text input (value not in options) */
  @Input() allowFreeText = false;

  /** Custom template for option content */
  @ContentChild('optionTemplate') optionTemplate?: TemplateRef<unknown>;

  /** Emitted when value changes */
  @Output() valueChange = new EventEmitter<string | null>();

  /** Emitted when selection is cleared */
  @Output() cleared = new EventEmitter<void>();

  /** The current input/search value */
  inputValue = '';

  /** Filtered options based on search */
  filteredOptions: SelectableOption[] = [];

  /** Cached available options (after exclusion filtering) */
  private cachedAvailableOptions: SelectableOption[] = [];

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
    ).subscribe(() => {
      this.applyFilter();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['filterExcluded']) {
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
    if (!this.filterExcluded) {
      this.cachedAvailableOptions = this.options;
      return;
    }

    this.cachedAvailableOptions = this.options.filter(option => !option.excluded);
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
      const valueMatch = option.value.toLowerCase().includes(query);
      const labelMatch = option.label.toLowerCase().includes(query);
      const secondaryMatch = option.secondaryLabel?.toLowerCase().includes(query);
      return valueMatch || labelMatch || secondaryMatch;
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
        opt => opt.value === value || opt.label === value
      );
      if (exactMatch) {
        this.valueChange.emit(exactMatch.value);
      } else if (this.allowFreeText) {
        this.valueChange.emit(value);
      }
    }
  }

  /**
   * Called when an option is selected from autocomplete
   */
  onOptionSelected(optionValue: string): void {
    this.inputValue = optionValue;
    this.valueChange.emit(optionValue);
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
   * Track options by value for ngFor
   */
  trackByValue(_index: number, option: SelectableOption): string {
    return option.value;
  }
}

// ============================================================================
// BACKWARDS COMPATIBLE WRAPPER (for existing usage with FilterableFieldOption)
// ============================================================================

/**
 * Wrapper component that maintains backwards compatibility with FilterableFieldOption interface.
 * @deprecated Consider migrating to FilterableSelectComponent with SelectableOption interface.
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

  @Input() label = 'Feld auswählen';
  @Input() placeholder = 'Feldname eingeben oder auswählen...';
  @Input() hint = '';
  @Input() options: FilterableFieldOption[] = [];
  @Input() value: string | null = null;
  @Input() required = false;
  @Input() showCardinality = true;
  @Input() filterZeroCardinality = true;
  @Input() errorMessage = 'Bitte wählen Sie ein Feld aus';

  @Output() valueChange = new EventEmitter<string | null>();
  @Output() cleared = new EventEmitter<void>();

  inputValue = '';
  filteredOptions: SelectableOption[] = [];
  showBadge = true;
  noResultsMessage = 'Keine Felder gefunden';

  private cachedOptions: SelectableOption[] = [];
  private inputSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.inputValue = this.value || '';
    this.showBadge = this.showCardinality;
    this.updateCachedOptions();
    this.applyFilter();

    this.inputSubject.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilter();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['filterZeroCardinality'] || changes['showCardinality']) {
      this.showBadge = this.showCardinality;
      this.updateCachedOptions();
      this.applyFilter();
    }
    if (changes['value'] && !changes['value'].firstChange) {
      this.inputValue = this.value || '';
    }
  }

  private updateCachedOptions(): void {
    this.cachedOptions = this.options.map(opt => this.convertToSelectableOption(opt));
    
    if (this.filterZeroCardinality) {
      this.cachedOptions = this.cachedOptions.filter(opt => !opt.excluded);
    }
  }

  private convertToSelectableOption(opt: FilterableFieldOption): SelectableOption {
    const maxCard = opt.cardinalityMax;
    const isExcluded = maxCard === 0 || maxCard === '0';
    const badge = this.formatCardinality(opt.cardinalityMin, opt.cardinalityMax);
    
    return {
      value: opt.name,
      label: opt.name,
      secondaryLabel: opt.displayName,
      badge: badge,
      additionalInfo: opt.additionalInfo,
      excluded: isExcluded
    };
  }

  private formatCardinality(min: number | string | null | undefined, max: number | string | null | undefined): string {
    if (min === undefined && max === undefined) return '';
    const minVal = min ?? '?';
    const maxVal = max ?? '?';
    return `${minVal}..${maxVal}`;
  }

  applyFilter(): void {
    const query = this.inputValue.trim().toLowerCase();

    if (!query) {
      this.filteredOptions = this.cachedOptions;
      return;
    }

    this.filteredOptions = this.cachedOptions.filter(option => {
      const valueMatch = option.value.toLowerCase().includes(query);
      const labelMatch = option.label.toLowerCase().includes(query);
      const secondaryMatch = option.secondaryLabel?.toLowerCase().includes(query);
      return valueMatch || labelMatch || secondaryMatch;
    });
  }

  onInputChange(value: string): void {
    this.inputValue = value;
    this.inputSubject.next(value);

    if (value === '') {
      this.valueChange.emit(null);
    } else {
      const exactMatch = this.cachedOptions.find(
        opt => opt.value === value || opt.label === value
      );
      if (exactMatch) {
        this.valueChange.emit(exactMatch.value);
      }
    }
  }

  onOptionSelected(optionValue: string): void {
    this.inputValue = optionValue;
    this.valueChange.emit(optionValue);
  }

  clear(): void {
    this.inputValue = '';
    this.valueChange.emit(null);
    this.cleared.emit();
    this.applyFilter();
  }

  hasCardinality(option: SelectableOption): boolean {
    return !!option.badge;
  }

  getCardinalityDisplay(option: SelectableOption): string {
    return option.badge || '';
  }

  trackByValue(_index: number, option: SelectableOption): string {
    return option.value;
  }
}
