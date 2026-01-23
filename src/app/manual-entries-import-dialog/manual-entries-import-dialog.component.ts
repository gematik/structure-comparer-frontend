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

/**
 * Dialog component for importing legacy manual_entries.yaml files
 * Provides file upload, validation, import progress, and result display
 */
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { finalize } from 'rxjs/operators';

import { ProjectService } from '../project.service';
import { ImportManualEntriesResponse } from '../models/manual-entries-import.model';

export interface ManualEntriesImportDialogData {
  projectKey: string;
}

@Component({
  selector: 'app-manual-entries-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './manual-entries-import-dialog.component.html',
  styleUrl: './manual-entries-import-dialog.component.css'
})
export class ManualEntriesImportDialogComponent {

  // File handling properties
  selectedImportFile: File | null = null;
  isImportingManualEntries = false;

  // Import result properties
  importResult: ImportManualEntriesResponse | null = null;
  importError: string | null = null;

  // Project key from dialog data
  projectKey: string;

  constructor(
    public dialogRef: MatDialogRef<ManualEntriesImportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ManualEntriesImportDialogData,
    private projectService: ProjectService
  ) {
    this.projectKey = data.projectKey;
  }

  /**
   * Handles file selection for manual entries import
   * Validates file type and resets previous results
   * @param event The file input change event
   */
  onManualEntriesFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.selectedImportFile = null;
      return;
    }

    const file = input.files[0];

    // Optional: einfache Dateityp-Prüfung
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.yaml') && !lowerName.endsWith('.yml')) {
      this.importError = 'Bitte wählen Sie eine YAML-Datei (.yaml oder .yml) aus.';
      this.selectedImportFile = null;
      return;
    }

    this.importError = null;
    this.importResult = null;
    this.selectedImportFile = file;
  }

  /**
   * Starts the manual entries import process
   * Calls the backend API and handles the response
   */
  onImportManualEntries(): void {
    if (!this.selectedImportFile) {
      return;
    }

    if (!this.projectKey) {
      this.importError = 'Projekt-Schlüssel ist nicht verfügbar.';
      return;
    }

    this.isImportingManualEntries = true;
    this.importError = null;
    this.importResult = null;

    this.projectService.importManualEntries(this.projectKey, this.selectedImportFile)
      .pipe(finalize(() => {
        this.isImportingManualEntries = false;
      }))
      .subscribe({
        next: (response: ImportManualEntriesResponse) => {
          this.importResult = response;
          if (!this.projectService.isImportSuccessful(response)) {
            this.importError = response.message || 'Import fehlgeschlagen.';
          }
        },
        error: (error) => {
          // Fehlertext aus HttpErrorResponse extrahieren
          this.importError = this.extractImportErrorMessage(error);
        }
      });
  }

  /**
   * Checks if an import was successful
   * @param response The import response to check
   * @returns True if successful, false otherwise
   */
  isImportSuccessful(response: ImportManualEntriesResponse): boolean {
    return this.projectService.isImportSuccessful(response);
  }

  /**
   * Extracts error message from HTTP error response
   * @param error The HTTP error response
   * @returns Formatted error message for display
   */
  private extractImportErrorMessage(error: any): string {
    if (error?.error?.error) {
      return error.error.error;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Beim Import ist ein unbekannter Fehler aufgetreten.';
  }

  /**
   * Closes the dialog without returning data
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Closes the dialog and returns the import result
   */
  onClose(): void {
    this.dialogRef.close(this.importResult);
  }
}
