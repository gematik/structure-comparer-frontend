import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { firstValueFrom } from 'rxjs';
import { MappingsListComponent } from '../mappings-list/mappings-list.component';
import { MappingsService } from '../mappings.service';
import { Comparison } from '../models/comparison.model';
import { Mapping } from '../models/mapping.model';
import { Package } from '../models/package.model';
import { ProjectService } from '../project.service';
import { AddComparisonDialogComponent } from '../add-comparison-dialog/add-comparison-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ComparisonService } from '../comparison.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [MappingsListComponent, CommonModule, FontAwesomeModule],
  templateUrl: './edit-project.component.html',
  styleUrl: './edit-project.component.css'
})
export class EditProjectComponent implements OnInit {

  packages: Package[] = [];
  comparisons: Comparison[] = [];
  mappings: Mapping[] = [];
  projectName: string = '';
  projectKey: string = '';
  projectData: any;
  faEdit = faEdit; // Icon für den Edit-Button
  faPlus = faPlus; // Icon für den Plus-Button
  faTrash = faTrash
  constructor(private route: ActivatedRoute, private mappingsService: MappingsService, private projectService: ProjectService, private comparisonService: ComparisonService, private router: Router, private dialog: MatDialog) { }

  // Initialisierung der Komponente. Hier werden die Projektdaten geladen und bisher die Mappings herausgezogen
  async ngOnInit() {
    this.projectData = this.projectService.getProjectData();
    this.projectKey = this.route.snapshot.paramMap.get('projectKey') || '';
    if (!this.projectData) {
      console.warn('Project data not found in service. Reloading...');
      await this.reloadProject();
    }

    if (this.projectData) {
      this.projectName = this.projectData.name;
      this.mappings = this.projectData.mappings;
      this.packages = this.projectData.packages;
      this.comparisons = this.projectData.comparisons;

    } else {
      console.error('Project data could not be loaded!');
    }
  }

  // Diese Methode ist der Fallback, falls das Übertragen der Daten aus dem Aufruf dieser Seite nicht funktioniert hat.
  private async reloadProject() {
    const projectKey = this.route.snapshot.paramMap.get('projectKey');
    if (projectKey) {
      try {
        const data = await firstValueFrom(this.projectService.reloadProjectData(projectKey));
        this.projectData = data;
        console.log('Projekt geladen:', data);
      } catch (error) {
        console.error('Fehler beim Laden des Projekts:', error);
      }
    }
    console.log('Project data:', this.projectData);
  }

  goToMapping(mappingId: string): void {

    this.router.navigate([`/project`, this.projectKey, `mapping`, mappingId]);
  }

  goToComparison(comparisonId: string): void {

    this.router.navigate([`/project`, this.projectKey, `comparison`, comparisonId]);
  }

  editPackage() {
    console.log('Bearbeite Package:',);
  }

  deleteComparisonWithConfirm(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: { message: 'Willst du diesen Vergleich wirklich löschen?' }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.comparisonService.deleteComparison(this.projectKey, id).subscribe(() => {
          this.comparisons = this.comparisons.filter(c => c.id !== id);
        });
      }
    });
  }

  deleteComparison(comparionsonId: string) {
   this.comparisonService.deleteComparison(this.projectKey, comparionsonId).subscribe(
      response => { 
        console.log('Comparison deleted successfully:', response);
        this.comparisons = this.comparisons.filter(comparison => comparison.id !== comparionsonId);
      },
      error => {
        console.error('Error deleting comparison:', error);
      });
  }

  openAddComparisonDialogAndSave(projectKey: string) {
    this.dialog.open(AddComparisonDialogComponent, {
      width: '400px',
      data: { projectKey }
    }).afterClosed().subscribe(result => {
      if (result) {
        const comparisonData = this.mapToApiPayload(result);
        this.saveComparison(projectKey, comparisonData);
      }
    });
  }
  
  private mapToApiPayload(result: any) {
    return {
      source_ids: [result.sourceProfileKey],
      target_id: result.targetProfileKey
    };
  }
  
  private saveComparison(projectKey: string, payload: any) {
    this.comparisonService.createComparison(projectKey, payload).subscribe(
      comparison => {
        this.comparisons.push(comparison);
      },
      error => {
        console.error('Fehler beim Erstellen des Vergleichs:', error);
      }
    );
  }
  


}
