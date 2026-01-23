import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

export interface ProfileData {
  name: string;
  url: string | null;  // Canonical URL
  version: string;
  webUrl: string | null;  // Documentation/Simplifier URL
  package: string | null;
}

export interface EditMappingDialogData {
  name: string;
  status: string;
  version: string;
  sources: ProfileData[];
  target: ProfileData;
}

export interface ProfileUpdateData {
  url?: string;  // Canonical URL
  version?: string;
  webUrl?: string;  // Documentation/Simplifier URL
  package?: string;
}

export interface EditMappingDialogResult {
  status: string;
  version: string;
  sources?: ProfileUpdateData[];
  target?: ProfileUpdateData;
}

@Component({
  selector: 'app-edit-mapping-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './edit-mapping-dialog.component.html',
  styleUrls: ['./edit-mapping-dialog.component.css']
})
export class EditMappingDialogComponent {
  status: string;
  version: string;
  sources: ProfileData[];
  target: ProfileData;

  availableStatuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'retired', label: 'Retired' },
    { value: 'unknown', label: 'Unknown' }
  ];

  constructor(
    public dialogRef: MatDialogRef<EditMappingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditMappingDialogData
  ) {
    this.status = data.status;
    this.version = data.version;
    // Deep copy to avoid mutating original data
    this.sources = JSON.parse(JSON.stringify(data.sources));
    this.target = JSON.parse(JSON.stringify(data.target));
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    const result: EditMappingDialogResult = {
      status: this.status,
      version: this.version,
      sources: this.sources.map(source => ({
        url: source.url || undefined,
        version: source.version,
        webUrl: source.webUrl || undefined,
        package: source.package || undefined
      })),
      target: {
        url: this.target.url || undefined,
        version: this.target.version,
        webUrl: this.target.webUrl || undefined,
        package: this.target.package || undefined
      }
    };
    this.dialogRef.close(result);
  }
}
