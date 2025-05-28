import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { PackageService } from '../package.service';
import { MatDialogActions } from '@angular/material/dialog';
import { MatDialogContent } from '@angular/material/dialog';
import { MatDialogTitle } from '@angular/material/dialog';

@Component({
  standalone: true,
  selector: 'app-update-package-name-dialog',
  templateUrl: './update-package-name-dialog.component.html',
  styleUrls: ['./update-package-name-dialog.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle
  ]
})
export class UpdatePackageNameDialogComponent {
  packageName: string = '';
  projectKey: string = '';
  packageId: string = '';

  constructor(
    private dialogRef: MatDialogRef<UpdatePackageNameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentName: string, projectKey: string, packageId: string },
    private packageService: PackageService
    
  ) {
    this.packageName = data.currentName;
    this.projectKey = data.projectKey;
    this.packageId = data.packageId;
  }

  save() {
    this.packageService.updatePackage(this.projectKey, this.packageId, this.packageName)
      .subscribe({
        next: () => {
          console.log('Package name updated successfully');
          this.dialogRef.close(this.packageName);
        },
        error: (error) => {
          console.error('Error updating package name:', error);
        }
      });

  }

  cancel() {
    this.dialogRef.close(null);
  }
}
