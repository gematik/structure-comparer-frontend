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
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Profile } from '../models/profile.model';
import { TransformationCreate } from '../models/transformation.model';
import { TransformationService } from '../transformation.service';
import { ProjectService } from '../project.service';

@Component({
  selector: 'app-add-transformation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule
  ],
  templateUrl: './add-transformation-dialog.component.html',
  styleUrl: './add-transformation-dialog.component.css'
})
export class AddTransformationDialogComponent implements OnInit {
  projectKey: string;

  // Form fields
  name: string = '';
  version: string = '1.0.0';
  status: string = 'draft';
  description: string = '';

  // Source profiles (multiple)
  sourceProfiles: { url: string; name: string }[] = [{ url: '', name: '' }];

  // Target profile (single)
  targetProfile: { url: string; name: string } = { url: '', name: '' };

  // Profile selection
  packageGroups: { package: string; profiles: Profile[] }[] = [];
  collapsedGroups = new Set<string>();

  // Status options
  statusOptions = ['draft', 'active', 'published', 'deprecated'];

  loading = false;

  constructor(
    private dialogRef: MatDialogRef<AddTransformationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectKey: string },
    private transformationService: TransformationService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {
    this.projectKey = data.projectKey;
  }

  ngOnInit(): void {
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.projectService.getProjectProfiles(this.projectKey).subscribe({
      next: (result) => {
        this.groupProfilesByPackage(result.profiles);
      },
      error: (err) => {
        console.error('Error loading profiles:', err);
        this.snackBar.open('Fehler beim Laden der Profile', 'OK', { duration: 5000 });
      }
    });
  }

  groupProfilesByPackage(profiles: Profile[]): void {
    const grouped = new Map<string, Profile[]>();
    for (const profile of profiles) {
      if (!grouped.has(profile.package)) {
        grouped.set(profile.package, []);
      }
      grouped.get(profile.package)!.push(profile);
    }
    this.packageGroups = Array.from(grouped.entries()).map(([pkg, profiles]) => ({
      package: pkg,
      profiles
    }));
  }

  toggleGroup(pkg: string): void {
    if (this.collapsedGroups.has(pkg)) {
      this.collapsedGroups.delete(pkg);
    } else {
      this.collapsedGroups.add(pkg);
    }
  }

  isGroupCollapsed(pkg: string): boolean {
    return this.collapsedGroups.has(pkg);
  }

  addSourceProfile(): void {
    this.sourceProfiles.push({ url: '', name: '' });
  }

  removeSourceProfile(index: number): void {
    if (this.sourceProfiles.length > 1) {
      this.sourceProfiles.splice(index, 1);
    }
  }

  onSourceProfileSelected(index: number, profileKey: string): void {
    // Find the selected profile and update URL and name
    for (const group of this.packageGroups) {
      const profile = group.profiles.find(p => p.key === profileKey);
      if (profile) {
        this.sourceProfiles[index] = {
          url: profile.url || profile.key,
          name: profile.name
        };
        break;
      }
    }
  }

  onTargetProfileSelected(profileKey: string): void {
    // Find the selected profile and update URL and name
    for (const group of this.packageGroups) {
      const profile = group.profiles.find(p => p.key === profileKey);
      if (profile) {
        this.targetProfile = {
          url: profile.url || profile.key,
          name: profile.name
        };
        break;
      }
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  isFormValid(): boolean {
    return (
      this.name.trim() !== '' &&
      this.version.trim() !== '' &&
      this.sourceProfiles.some(sp => sp.url.trim() !== '') &&
      this.targetProfile.url.trim() !== ''
    );
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (!this.isFormValid()) {
      this.snackBar.open('Bitte füllen Sie alle Pflichtfelder aus', 'OK', { duration: 3000 });
      return;
    }

    this.loading = true;

    const sources = this.sourceProfiles
      .filter(sp => sp.url.trim() !== '')
      .map(sp => ({
        url: sp.url,
        name: sp.name || undefined
      }));

    const target = {
      url: this.targetProfile.url,
      name: this.targetProfile.name || undefined
    };

    const newTransformation: TransformationCreate = {
      name: this.name.trim(),
      version: this.version.trim(),
      status: this.status,
      description: this.description.trim() || undefined,
      sources,
      target
    };

    this.transformationService.createTransformation(this.projectKey, newTransformation)
      .subscribe({
        next: (result) => {
          this.loading = false;
          this.snackBar.open('Transformation erfolgreich erstellt', 'OK', { duration: 3000 });
          this.dialogRef.close(result);
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open('Fehler beim Erstellen der Transformation', 'OK', { duration: 5000 });
          console.error('Error creating transformation:', err);
        }
      });
  }
}
