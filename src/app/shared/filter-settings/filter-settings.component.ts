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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';

export interface FilterSettings {
  showParentNodes: boolean;
  hideChildrenOfMaxZeroFields: boolean;
}

@Component({
  selector: 'app-filter-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTooltipModule,
    FormsModule
  ],
  templateUrl: './filter-settings.component.html',
  styleUrls: ['./filter-settings.component.css']
})
export class FilterSettingsComponent {
  @Input() settings: FilterSettings = {
    showParentNodes: true,
    hideChildrenOfMaxZeroFields: true
  };

  @Output() settingsChanged = new EventEmitter<FilterSettings>();

  isExpanded = false;

  toggleExpansion(): void {
    this.isExpanded = !this.isExpanded;
  }

  onSettingChanged(): void {
    this.settingsChanged.emit({ ...this.settings });
  }
}
