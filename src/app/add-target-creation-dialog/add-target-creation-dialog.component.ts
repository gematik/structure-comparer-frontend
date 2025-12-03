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
 * Add Target Creation Dialog - Phase 8.4 Implementation
 *
 * Simplified version of AddMappingDialog for Target Creations.
 * Only requires selecting a target profile (no source profiles).
 */

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Profile } from '../models/profile.model';
import { ProjectService } from '../project.service';
import { TargetCreationService } from '../target-creation.service';
import { TargetCreationCreateInput } from '../models/target-creation.model';
import { GroupedSelectComponent, GroupedSelectOption } from '../shared/grouped-select/grouped-select.component';

export interface AddTargetCreationDialogData {
  projectKey: string;
}

@Component({
  selector: 'app-add-target-creation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    GroupedSelectComponent
  ],
  templateUrl: './add-target-creation-dialog.component.html',
  styleUrl: './add-target-creation-dialog.component.css'
})
export class AddTargetCreationDialogComponent implements OnInit {
  projectKey: string;
  targetProfileKey: string = '';
  profileOptions: GroupedSelectOption[] = [];
  profiles: Profile[] = [];
  isCreating: boolean = false;

  constructor(
    private dialogRef: MatDialogRef<AddTargetCreationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddTargetCreationDialogData,
    private projectService: ProjectService,
    private targetCreationService: TargetCreationService,
    private snackBar: MatSnackBar
  ) {
    this.projectKey = data.projectKey;
  }

  ngOnInit(): void {
    this.loadProfiles();
  }

  private loadProfiles(): void {
    this.projectService.getProjectProfiles(this.projectKey).subscribe({
      next: (response) => {
        this.profiles = response.profiles;
        this.groupProfilesByPackage(response.profiles);
      },
      error: (err) => {
        console.error('Error loading profiles', err);
        this.snackBar.open('Error loading profiles', 'Close', { duration: 3000 });
      }
    });
  }

  private groupProfilesByPackage(profiles: Profile[]): void {
    this.profileOptions = profiles.map(profile => ({
      value: profile.key,
      label: profile.name,
      group: profile.package
    }));
  }

  canCreate(): boolean {
    return this.targetProfileKey.length > 0 && !this.isCreating;
  }

  getSelectedProfileName(): string {
    const profile = this.profiles.find(p => p.key === this.targetProfileKey);
    return profile ? `${profile.name} (${profile.version})` : '';
  }

  create(): void {
    if (!this.canCreate()) {
      return;
    }

    const selectedProfile = this.profiles.find(p => p.key === this.targetProfileKey);
    if (!selectedProfile) {
      this.snackBar.open('Selected profile not found', 'Close', { duration: 3000 });
      return;
    }

    this.isCreating = true;

    const input: TargetCreationCreateInput = {
      targetprofile: {
        url: selectedProfile.url,
        version: selectedProfile.version,
        webUrl: selectedProfile.webUrl,
        package: selectedProfile.package
      }
    };

    this.targetCreationService.createTargetCreation(this.projectKey, input).subscribe({
      next: (response) => {
        this.snackBar.open('Target Creation created successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(response.id);
      },
      error: (err) => {
        console.error('Error creating target creation', err);
        this.snackBar.open('Error creating Target Creation', 'Close', { duration: 3000 });
        this.isCreating = false;
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
