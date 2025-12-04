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
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

/**
 * Interface for grouped selectable options
 */
export interface GroupedSelectOption {
  /** The unique value (used as selection value) */
  value: string;
  /** Display label for the option */
  label: string;
  /** Group name for grouping options */
  group: string;
}

/**
 * Interface for option groups (used internally)
 */
export interface OptionGroup {
  /** Group name / package name */
  name: string;
  /** Options within this group */
  options: GroupedSelectOption[];
  /** Whether group is collapsed */
  collapsed: boolean;
}

/**
 * A reusable component for grouped selection with autocomplete filtering.
 * Supports text-based filtering and collapsible groups.
 * Used for profile selection with package grouping.
 */
@Component({
  selector: 'app-grouped-select',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './grouped-select.component.html',
  styleUrls: ['./grouped-select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GroupedSelectComponent implements OnInit, OnChanges, OnDestroy {

  /** Label for the input field */
  @Input() label = 'Auswählen';

  /** Placeholder text */
  @Input() placeholder = 'Eingeben oder auswählen...';

  /** All available options (will be grouped by the group property) */
  @Input() options: GroupedSelectOption[] = [];

  /** Currently selected value */
  @Input() value: string | null = null;

  /** Whether the field is required */
  @Input() required = false;

  /** Emitted when value changes */
  @Output() valueChange = new EventEmitter<string | null>();

  /** Current input text */
  inputValue = '';

  /** Filtered and grouped options for display */
  filteredGroups: OptionGroup[] = [];

  /** All groups (unfiltered) */
  private allGroups: OptionGroup[] = [];

  /** Track collapsed state by group name */
  private collapsedGroups = new Set<string>();

  /** Subject for debounced input changes */
  private inputSubject = new Subject<string>();

  /** Destroy subject for cleanup */
  private destroy$ = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeInputValue();
    this.buildGroups();
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
    if (changes['options']) {
      this.buildGroups();
      this.applyFilter();
    }
    if (changes['value'] && !changes['value'].firstChange) {
      this.initializeInputValue();
    }
  }

  /**
   * Initialize input value from selected value
   */
  private initializeInputValue(): void {
    if (this.value) {
      const option = this.options.find(o => o.value === this.value);
      this.inputValue = option?.label || this.value;
    } else {
      this.inputValue = '';
    }
  }

  /**
   * Build option groups from flat options array
   */
  private buildGroups(): void {
    const groupMap = new Map<string, GroupedSelectOption[]>();

    for (const option of this.options) {
      const groupName = option.group || 'Andere';
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(option);
    }

    this.allGroups = Array.from(groupMap.entries()).map(([name, options]) => ({
      name,
      options,
      collapsed: this.collapsedGroups.has(name)
    }));
  }

  /**
   * Apply text filter to options
   */
  private applyFilter(): void {
    const query = (this.inputValue || '').trim().toLowerCase();

    if (!query) {
      // No filter - show all groups with their collapse state
      this.filteredGroups = this.allGroups.map(group => ({
        ...group,
        collapsed: this.collapsedGroups.has(group.name)
      }));
      return;
    }

    // Filter options by query, only show groups with matching options
    this.filteredGroups = this.allGroups
      .map(group => {
        const filteredOptions = group.options.filter(option =>
          option.label.toLowerCase().includes(query) ||
          option.value.toLowerCase().includes(query) ||
          option.group.toLowerCase().includes(query)
        );
        return {
          name: group.name,
          options: filteredOptions,
          collapsed: false // Expand all groups when filtering
        };
      })
      .filter(group => group.options.length > 0);
  }

  /**
   * Handle input text change
   */
  onInputChange(value: string | any): void {
    // Handle both string input and potential object from mat-autocomplete
    const stringValue = typeof value === 'string' ? value : '';
    this.inputValue = stringValue;
    this.inputSubject.next(stringValue);

    // If input is empty, clear the selection
    if (!stringValue.trim()) {
      this.valueChange.emit(null);
    }
  }

  /**
   * Handle option selection from autocomplete
   */
  onOptionSelected(option: GroupedSelectOption): void {
    this.inputValue = option.label;
    this.valueChange.emit(option.value);
  }

  /**
   * Handle autocomplete selection event (triggered by Enter or mouse click)
   */
  onAutocompleteSelected(event: any): void {
    // The event.option.value contains the option.value (string) we set in [value]
    const selectedValue = event.option.value;
    
    // Find the full option object by value
    const option = this.options.find(o => o.value === selectedValue);
    if (option) {
      this.inputValue = option.label;
      this.valueChange.emit(option.value);
      this.cdr.markForCheck();
    }
  }

  /**
   * Clear the selection
   */
  clear(): void {
    this.inputValue = '';
    this.valueChange.emit(null);
    this.applyFilter();
    this.cdr.markForCheck();
  }

  /**
   * Toggle group collapsed state
   */
  toggleGroup(groupName: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.collapsedGroups.has(groupName)) {
      this.collapsedGroups.delete(groupName);
    } else {
      this.collapsedGroups.add(groupName);
    }

    // Update the group's collapsed state in filteredGroups
    const group = this.filteredGroups.find(g => g.name === groupName);
    if (group) {
      group.collapsed = this.collapsedGroups.has(groupName);
    }

    this.cdr.markForCheck();
  }

  /**
   * Check if a group is collapsed
   */
  isGroupCollapsed(groupName: string): boolean {
    return this.collapsedGroups.has(groupName);
  }

  /**
   * Track groups by name
   */
  trackByGroupName(_index: number, group: OptionGroup): string {
    return group.name;
  }

  /**
   * Track options by value
   */
  trackByValue(_index: number, option: GroupedSelectOption): string {
    return option.value;
  }
}
