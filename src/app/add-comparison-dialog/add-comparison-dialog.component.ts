import { Component, Inject } from '@angular/core';
import { Profile } from '../models/profile.model'; 
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../project.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';


@Component({
  selector: 'app-add-comparison-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './add-comparison-dialog.component.html',
  styleUrl: './add-comparison-dialog.component.css'
})
export class AddComparisonDialogComponent {
  
  projectKey: string;
  sourceProfileKey = '';
  targetProfileKey = '';
  

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


  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    this.dialogRef.close({
      sourceProfileKey: this.sourceProfileKey,
      targetProfileKey: this.targetProfileKey
    });
  }
}
