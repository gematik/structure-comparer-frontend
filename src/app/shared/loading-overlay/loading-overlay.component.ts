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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div *ngIf="isVisible" class="loading-overlay">
      <mat-spinner [diameter]="diameter" color="primary"></mat-spinner>
      <div class="loading-text">{{ message }}</div>
    </div>
  `,
  styleUrls: ['./loading-overlay.component.css']
})
export class LoadingOverlayComponent {
  @Input() isVisible: boolean = false;
  @Input() message: string = 'Loading...';
  @Input() diameter: number = 60;
}
