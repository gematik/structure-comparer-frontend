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
 * *******
 *
 * For additional notes and disclaimer from gematik and in case of changes by gematik find details in the "Readme" file.
 */
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MappingField } from '../../models/mapping.model';
import { MappingStatus } from '../../models/mapping-evaluation.model';
import { StatusHelper } from '../../mapping-detail/mapping-detail-helpers';

@Component({
  selector: 'app-mapping-status-display',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './mapping-status-display.component.html',
  styleUrl: './mapping-status-display.component.css'
})
export class MappingStatusDisplayComponent {
  @Input() field?: MappingField;
  @Input() status?: MappingStatus;
  @Input() showTooltip: boolean = true;
  @Input() compact: boolean = false;

  /**
   * Gets the mapping status to display
   */
  getStatus(): MappingStatus {
    if (this.status) {
      return this.status;
    }
    if (this.field?.evaluation) {
      return this.field.evaluation.mapping_status;
    }
    return 'incompatible'; // fallback
  }

  /**
   * Gets the label for the status
   */
  getLabel(): string {
    if (this.field) {
      return StatusHelper.getLabelForField(this.field);
    }
    return StatusHelper.getLabelForStatus(this.getStatus());
  }

  /**
   * Gets the CSS class for the status
   */
  getCssClass(): string {
    if (this.field) {
      return StatusHelper.getClassForField(this.field);
    }
    return StatusHelper.getClassForStatus(this.getStatus());
  }

  /**
   * Gets the tooltip text for the status
   */
  getTooltip(): string {
    if (!this.showTooltip) {
      return '';
    }

    if (this.field) {
      const tooltipLines = StatusHelper.getFieldStatusTooltip(this.field);
      return tooltipLines.join('\n');
    }

    return StatusHelper.getDefaultTooltip(this.getStatus());
  }

  /**
   * Checks if the field has inherited incompatibility
   */
  hasInheritedIncompatibility(): boolean {
    if (!this.field) {
      return false;
    }
    return StatusHelper.hasInheritedIncompatibility(this.field);
  }
}
