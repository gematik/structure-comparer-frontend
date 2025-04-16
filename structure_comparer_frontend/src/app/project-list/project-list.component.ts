import { Component, OnInit } from '@angular/core';
import { MappingsService } from '../mappings.service';
import { ProjectService } from '../project.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEdit, faTrash, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule, MatInputModule, MatFormFieldModule],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  projects: any[] = [];
  newProjectName: string = '';
  faEye = faEye;
  faEdit = faEdit;
  faTrash = faTrash;
  faPlus = faPlus
  faTimes = faTimes;

  constructor(private mappingsService: MappingsService, private projectService: ProjectService, private router: Router) { }

  ngOnInit(): void {
    this.mappingsService.listProjects().subscribe(
      data => this.projects = data,
      error => console.error(error)
    );
  }

  

  loadProject(projectName: string): void {
    this.mappingsService.initProject(projectName).subscribe(
      (projectData) =>{
        this.projectService.setProjectData(projectData);
        this.router.navigate([`/edit-project`, projectName])
      },
        error => console.error(error)
    );
  }

  createProject(): void {
    console.log('projekt',this.newProjectName);
    if (this.newProjectName.trim() === '') {
      alert('Project name is required');
      return;
    }
    let projectKey : string = this.newProjectName.replace(/\s+/g, '_').toLowerCase(); 
    this.mappingsService.createProject(projectKey, this.newProjectName).subscribe(
      () => {
        this.projects.push(this.newProjectName);
        this.newProjectName = '';
      },
      error => console.error(error)
    );
  }
}