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


@Component({
  selector: 'app-add-comparison-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSelectModule, MatFormFieldModule, MatButtonModule, MatIconModule],
  templateUrl: './add-comparison-dialog.component.html',
  styleUrl: './add-comparison-dialog.component.css'
})
export class AddComparisonDialogComponent {
  
  projectKey: string;
  sourceProfileKeys: string[] = [''];
  targetProfileKey = '';
  collapsedGroups = new Set<string>(); // enthält zugeklappte package-Namen
  

  packageGroups: { package: string; profiles: Profile[] }[] = [];

  constructor(private dialogRef: MatDialogRef<AddComparisonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectKey: string },
    private projectService: ProjectService
  ) {
    this.projectKey = data.projectKey
    
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
  }

  loadProfiles(projectKey: string) {
    
    console.log('Lade Profile für Projekt:', projectKey);
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
