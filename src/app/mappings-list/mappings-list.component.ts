import { Component, OnInit } from '@angular/core';
import { MappingsService } from '../mappings.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Mapping, SourceProfile, TargetProfile } from '../models/mapping.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEdit, faTrash, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mappings-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule],
  templateUrl: './mappings-list.component.html',
  styleUrls: ['./mappings-list.component.css']
})
export class MappingsListComponent implements OnInit {
  mappings: Mapping[] = [];
  newMapping: Mapping = this.initializeNewMapping();
  editMappingId: string | null = null;

  faEye = faEye;
  faEdit = faEdit;
  faTrash = faTrash;
  faSave = faSave;
  faTimes = faTimes;

  constructor(private mappingsService: MappingsService) { }

  ngOnInit(): void {
   // this.loadMappings();
  }

 /* loadMappings(): void {
    this.mappingsService.getMappings().subscribe(data => {
      this.mappings = data.mappings;
    });
  }
*/
  initializeNewMapping(): Mapping {
    return {
      id: '',
      last_updated: '',
      name: '',
      sources: [{ name: '', simplifier_url: '', version: '' }],
      status: 'draft',
      target: { name: '', simplifier_url: '', version: '' },
      version: ''
    };
  }

  addMapping(): void {
    this.mappingsService.addMapping(this.newMapping).subscribe(() => {
     // this.loadMappings();
      this.newMapping = this.initializeNewMapping();
    });
  }

  updateMapping(mapping: Mapping): void {
    this.mappingsService.updateMapping(mapping.id, mapping).subscribe(() => {
     // this.loadMappings();
      this.editMappingId = null;
    });
  }

  edit(mapping: Mapping): void {
    this.editMappingId = mapping.id;
  }

  cancelEdit(): void {
    this.editMappingId = null;
  }

  deleteMapping(mappingId: string): void {
    this.mappingsService.deleteMapping(mappingId).subscribe(() => {
     // this.loadMappings();
    });
  }

  addSource(mapping: Mapping): void {
    mapping.sources.push({ name: '', simplifier_url: '', version: '' });
  }

  addNewSource(): void {
    this.newMapping.sources.push({ name: '', simplifier_url: '', version: '' });
  }

  generateMappingName(mapping: Mapping): string {
    const sourceNames = mapping.sources.map(source => `${source.name}|${source.version}`).join(', ');
    const targetName = `${mapping.target.name}|${mapping.target.version}`;
    return `${sourceNames} -> ${targetName}`;
  }
}