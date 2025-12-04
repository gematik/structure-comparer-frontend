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
import { Profile } from '../models/profile.model'; 
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../project.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Dialog component for adding comparisons between profiles
 * Allows users to select source and target profiles for comparison
 */


@Component({
  selector: 'app-add-comparison-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSelectModule, MatFormFieldModule, MatButtonModule, MatIconModule],
  templateUrl: './add-comparison-dialog.component.html',
  styleUrl: './add-comparison-dialog.component.css'
})
export class AddComparisonDialogComponent {
  
  // The key of the project being worked with
  projectKey: string;
  // Array of source profile keys (can select multiple sources)
  sourceProfileKeys: string[] = [''];
  // Single target profile key for comparison
  targetProfileKey = '';
  // Set to track which package groups are collapsed in the UI
  collapsedGroups = new Set<string>();
  
  // Profiles grouped by package name for organized display
  packageGroups: { package: string; profiles: Profile[] }[] = [];

  constructor(private dialogRef: MatDialogRef<AddComparisonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectKey: string },
    private projectService: ProjectService
  ) {
    // Initialize with the project key passed from parent component
    this.projectKey = data.projectKey
  }

  ngOnInit() {
    // Load all profiles for the project when component initializes
    this.loadProfiles(this.projectKey);
  }

  /**
   * Groups profiles by their package name for organized display
   * @param profiles Array of profiles to group
   */
  groupProfilesByPackage(profiles: Profile[]) {
    const grouped = new Map<string, Profile[]>();

    // Group profiles by package name
    for (const profile of profiles) {
      if (!grouped.has(profile.package)) {
        grouped.set(profile.package, []);
      }
      grouped.get(profile.package)!.push(profile);
    }

    // Convert map to array format for template usage
    this.packageGroups = Array.from(grouped.entries()).map(([pkg, profiles]) => ({
      package: pkg,
      profiles
    }));
  }

  /**
   * Loads all profiles for the specified project
   * @param projectKey The key of the project to load profiles for
   */
  loadProfiles(projectKey: string) {
    console.log('Lade Profile fÃ¼r Projekt:', projectKey);
    this.projectService.getProjectProfiles(projectKey).subscribe(
      (profiles) => {
        console.log('Profile geladen:', profiles);
        // Group the loaded profiles by package for organized display
        this.groupProfilesByPackage(profiles.profiles);
      },
      (error) => {
        console.error('Fehler beim Laden der Profile:', error);
      }
    );
  }

  /**
   * Toggles the collapsed state of a package group
   * @param pkg The package name to toggle
   */
  toggleGroup(pkg: string): void {
    if (this.collapsedGroups.has(pkg)) {
      this.collapsedGroups.delete(pkg);
    } else {
      this.collapsedGroups.add(pkg);
    }
  }

  /**
   * Checks if a package group is currently collapsed
   * @param pkg The package name to check
   * @returns true if the group is collapsed
   */
  isGroupCollapsed(pkg: string): boolean {
    return this.collapsedGroups.has(pkg);
  }

  /**
   * Adds a new empty source profile selector to allow multiple source selections
   */
  addSourceProfileSelector(): void {
    this.sourceProfileKeys.push('');
  }

  /**
   * Removes a source profile selector at the specified index
   * @param index The index of the selector to remove
   */
  removeSourceProfileSelector(index: number): void {
    if (this.sourceProfileKeys.length > 1) {
      this.sourceProfileKeys.splice(index, 1);
    }
  }

  /**
   * Track by function for ngFor to improve performance
   * @param index The index of the item
   * @returns The index as tracking value
   */
  trackByIndex(index: number): number {
    return index;
  }


  /**
   * Cancels the dialog without saving any changes
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Saves the selected profiles and closes the dialog
   * Returns the selected source and target profile keys to the parent component
   */
  save(): void {
    // Filter out empty profile keys to ensure only valid selections are returned
    const validSourceProfileKeys = this.sourceProfileKeys.filter(key => key.trim() !== '');
    
    this.dialogRef.close({
      sourceProfileKeys: validSourceProfileKeys,
      targetProfileKey: this.targetProfileKey
    });
  }
}
