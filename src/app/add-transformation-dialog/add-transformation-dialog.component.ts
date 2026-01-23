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
import { TransformationService } from '../transformation.service';
import { ProjectService } from '../project.service';
import { GroupedSelectComponent, GroupedSelectOption } from '../shared/grouped-select/grouped-select.component';

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
    MatInputModule,
    GroupedSelectComponent
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

  // Source profile keys (multiple)
  sourceProfileKeys: string[] = [''];

  // Target profile key (single)
  targetProfileKey: string = '';

  // Profile selection
  packageGroups: { package: string; profiles: Profile[] }[] = [];
  profileOptions: GroupedSelectOption[] = [];
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
    console.log('Loading profiles for project:', this.projectKey);
    this.projectService.getProjectProfiles(this.projectKey).subscribe({
      next: (result) => {
        console.log('Profiles loaded:', result);
        this.groupProfilesByPackage(result.profiles);
        console.log('Package groups:', this.packageGroups);
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

    // Build profile options for grouped select
    this.profileOptions = profiles.map(profile => ({
      value: profile.key,
      label: profile.name,
      group: profile.package
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
    this.sourceProfileKeys.push('');
  }

  removeSourceProfile(index: number): void {
    if (this.sourceProfileKeys.length > 1) {
      this.sourceProfileKeys.splice(index, 1);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  isFormValid(): boolean {
    return (
      this.name.trim() !== '' &&
      this.version.trim() !== '' &&
      this.sourceProfileKeys.some(key => key.trim() !== '') &&
      this.targetProfileKey.trim() !== ''
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

    // Das Backend erwartet source_ids und target_id (Profile-Keys)
    const source_ids = this.sourceProfileKeys.filter(key => key.trim() !== '');

    const payload = {
      source_ids: source_ids,
      target_id: this.targetProfileKey
    };

    this.transformationService.createTransformation(this.projectKey, payload as any)
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
