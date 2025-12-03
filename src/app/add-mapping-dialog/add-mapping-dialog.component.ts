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
import { GroupedSelectComponent, GroupedSelectOption } from '../shared/grouped-select/grouped-select.component';

@Component({
  selector: 'app-add-mapping-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule, MatSelectModule, MatFormFieldModule, MatButtonModule, MatIconModule, GroupedSelectComponent],
  templateUrl: './add-mapping-dialog.component.html',
  styleUrl: './add-mapping-dialog.component.css'
})
export class AddMappingDialogComponent {
  projectKey: string;
  sourceProfileKeys: string[] = [''];
  targetProfileKey = '';
  collapsedGroups = new Set<string>();

  packageGroups: { package: string; profiles: Profile[] }[] = [];
  profileOptions: GroupedSelectOption[] = [];

  constructor(private dialogRef: MatDialogRef<AddMappingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectKey: string },
    private projectService: ProjectService
  ) {
    this.projectKey = data.projectKey;

  }

  ngOnInit() {

   this.loadProfiles(this.projectKey);


  }

  groupProfilesByPackage(profiles: Profile[]) {
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

  loadProfiles(projectKey: string) {

    console.log('Lade Profile fÃ¼r Projekt:', projectKey);
    this.projectService.getProjectProfiles(projectKey).subscribe(
      (profiles) => {
        console.log('Profile geladen:', profiles);
        this.groupProfilesByPackage(profiles.profiles);

      },
      (error) => {
        console.error('Fehler beim Laden der Profile:', error);
      }
    );
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

addSourceProfileSelector(): void {
  this.sourceProfileKeys.push('');
}

removeSourceProfileSelector(index: number): void {
  if (this.sourceProfileKeys.length > 1) {
    this.sourceProfileKeys.splice(index, 1);
  }
}

trackByIndex(index: number): number {
  return index;
}


  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    // Filter out empty profile keys
    const validSourceProfileKeys = this.sourceProfileKeys.filter(key => key.trim() !== '');

    this.dialogRef.close({
      sourceProfileKeys: validSourceProfileKeys,
      targetProfileKey: this.targetProfileKey
    });
  }
}
