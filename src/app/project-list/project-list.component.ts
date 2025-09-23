/**
 * Component for displaying and managing the list of projects
 * Allows users to view, create, and navigate to individual projects
 */
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
import { MatButtonModule } from '@angular/material/button'; 
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatIcon],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  // Object containing all projects data
  projects: any = {};
  // Name for creating a new project
  newProjectName: string = '';
  
  // FontAwesome icons used in the template
  faEye = faEye;
  faEdit = faEdit;
  faTrash = faTrash;
  faPlus = faPlus
  faTimes = faTimes;

  constructor(private mappingsService: MappingsService, private projectService: ProjectService, private router: Router) { }

  /**
   * Initializes the component by loading all available projects
   */
  ngOnInit(): void {
    this.mappingsService.listProjects().subscribe(
      data => this.projects = data,
      error => console.error(error)
    );
    console.log('Projects loaded:', this.projects);
  }

  /**
   * Loads a specific project and navigates to its detail page
   * @param projectURL The URL path of the project to load
   */
  loadProject(projectURL: string): void {
    this.mappingsService.initProject(projectURL).subscribe(
      (projectData) =>{
        // Cache the project data for use across the application
        this.projectService.setProjectData(projectData);
        this.router.navigate([projectURL])
      },
        error => console.error(error)
    );
  }

  /**
   * Creates a new project with the specified name
   * Converts the name to a URL-safe key format
   */
  createProject(): void {
    console.log('projekt',this.newProjectName);
    if (this.newProjectName.trim() === '') {
      alert('Project name is required');
      return;
    }
    // Convert project name to URL-safe key (replace spaces with underscores, lowercase)
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