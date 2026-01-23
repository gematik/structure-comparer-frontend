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
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface EditProjectMetadataDialogData {
  projectKey: string;
  projectName: string;
  currentVersion?: string;
  currentStatus?: string;
}

export interface EditProjectMetadataDialogResult {
  version?: string;
  status?: string;
}

@Component({
  selector: 'app-edit-project-metadata-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './edit-project-metadata-dialog.component.html',
  styleUrl: './edit-project-metadata-dialog.component.css'
})
export class EditProjectMetadataDialogComponent {
  version: string;
  status: string;

  constructor(
    public dialogRef: MatDialogRef<EditProjectMetadataDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditProjectMetadataDialogData
  ) {
    this.version = data.currentVersion || '';
    this.status = data.currentStatus || '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    const result: EditProjectMetadataDialogResult = {
      version: this.version || undefined,
      status: this.status || undefined
    };
    this.dialogRef.close(result);
  }
}
