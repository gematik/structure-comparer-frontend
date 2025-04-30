import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { firstValueFrom } from 'rxjs';
import { MappingsListComponent } from '../mappings-list/mappings-list.component';
import { MappingsService } from '../mappings.service';
import { Comparison } from '../models/comparison.model';
import { Mapping } from '../models/mapping.model';
import { Package } from '../models/package.model';
import { ProjectService } from '../project.service';
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
  projectData: any;
  faEdit = faEdit; // Icon für den Edit-Button

  constructor(private route: ActivatedRoute, private mappingsService: MappingsService, private projectService: ProjectService, private router: Router) { }
  // Initialisierung der Komponente. Hier werden die Projektdaten geladen und bisher die Mappings herausgezogen
  async ngOnInit() {
    this.projectData = this.projectService.getProjectData();

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
    const projectKey = this.route.snapshot.paramMap.get('projectKey');
    this.router.navigate([`/project`, projectKey, `mapping`, mappingId]);
  }

  editPackage() {
    console.log('Bearbeite Package:',);
  }

  editComparison() {
    console.log('Bearbeite Vergleich:',);
  }

  editMapping() {
    console.log('Bearbeite Mapping:',);
  }

}
