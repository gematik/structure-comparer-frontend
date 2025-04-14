import { Component } from '@angular/core';
import { Mapping } from '../models/mapping.model';
import { Package } from '../models/package.model';
import { Comparison } from '../models/comparison.model';

@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [],
  templateUrl: './edit-project.component.html',
  styleUrl: './edit-project.component.css'
})
export class EditProjectComponent {

packages: Package[] = [];
mappings: Mapping[] = [];
comparisons: Comparison[] = [];



}
