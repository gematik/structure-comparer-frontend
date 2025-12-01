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
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.css']
})
export class FilterBarComponent {
  /** Label for the toggle filter */
  @Input() toggleLabel = 'Filter aktivieren';

  /** Whether the toggle filter is enabled */
  @Input() toggleEnabled = true;

  /** Placeholder text for the search input */
  @Input() searchPlaceholder = 'Suchen...';

  /** Label for the search input */
  @Input() searchLabel = 'Suche';

  /** Current search text */
  @Input() searchText = '';

  /** Emits when toggle state changes */
  @Output() toggleChange = new EventEmitter<boolean>();

  /** Emits when search text changes */
  @Output() searchTextChange = new EventEmitter<string>();

  /** Emits when filters change (either toggle or search) */
  @Output() filterChange = new EventEmitter<{ toggleEnabled: boolean; searchText: string }>();

  onToggleChange(enabled: boolean): void {
    this.toggleEnabled = enabled;
    this.toggleChange.emit(enabled);
    this.emitFilterChange();
  }

  onSearchTextChange(text: string): void {
    this.searchText = text;
    this.searchTextChange.emit(text);
    this.emitFilterChange();
  }

  clearSearch(): void {
    this.searchText = '';
    this.searchTextChange.emit('');
    this.emitFilterChange();
  }

  private emitFilterChange(): void {
    this.filterChange.emit({
      toggleEnabled: this.toggleEnabled,
      searchText: this.searchText
    });
  }
}
