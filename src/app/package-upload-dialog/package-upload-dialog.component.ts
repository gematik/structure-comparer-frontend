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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PackageService } from '../package.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-file-upload-dialog',
  templateUrl: './package-upload-dialog.component.html',
  styleUrls: ['./package-upload-dialog.component.scss'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule
  ]
})
export class PackageUploadDialogComponent {
  selectedFile: File | null = null;
  projectKey: string;

  constructor(
    private dialogRef: MatDialogRef<PackageUploadDialogComponent>,
    private packageService: PackageService,
    @Inject(MAT_DIALOG_DATA) public data: { projectKey: string }
  ) {
    this.projectKey = data.projectKey;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && file.name.endsWith('.tgz')) {
      this.selectedFile = file;
    } else {
      alert('Bitte nur .tgz-Dateien hochladen.');
    }
  }

  async upload(): Promise<any> {
  if (!this.selectedFile) return;

  try {
    console.log('Uploading:', this.selectedFile);
    const response = await firstValueFrom(
      this.packageService.createPackage(this.projectKey, this.selectedFile)
    );
    console.log('Upload successful:', response);
    this.dialogRef.close(response); // â† response statt file
    return response;
  } catch (err) {
    console.error('Upload failed:', err);
    alert('Fehler beim Hochladen des Pakets.');
    return null;
  }
}

  cancel() {
    this.dialogRef.close();
  }
}
