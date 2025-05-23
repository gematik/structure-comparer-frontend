import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PackageService } from '../package.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

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

  upload() {
    if (this.selectedFile) {
      console.log('Uploading:', this.selectedFile);
      this.packageService
        .createPackage(this.projectKey, this.selectedFile)
        .subscribe({
          next: response => {
            console.log('Upload successful:', response);
            this.dialogRef.close(this.selectedFile);
          },
          error: err => {
            console.error('Upload failed:', err);
            alert('Fehler beim Hochladen des Pakets.');
          }
        });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
