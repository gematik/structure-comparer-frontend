import { Component, OnInit } from '@angular/core';
import { Mapping } from '../models/mapping.model';
import { Package } from '../models/package.model';
import { Comparison } from '../models/comparison.model';
import { MappingsListComponent } from '../mappings-list/mappings-list.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MappingsService } from '../mappings.service';

@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [MappingsListComponent, CommonModule],
  templateUrl: './edit-project.component.html',
  styleUrl: './edit-project.component.css'
})
export class EditProjectComponent implements OnInit {

  packages: Package[] = [];
  comparisons: Comparison[] = [];
  projectName: string = 'Projektname';

  constructor(private route: ActivatedRoute, private mappingsService: MappingsService) { }

  ngOnInit() {
    this.projectName = this.route.snapshot.paramMap.get('id')!;
    console.log('Bearbeite Projekt mit Namen:', this.projectName);
    this.mappingsService.initProject(this.projectName).subscribe(
      (data: any) => {
        console.log("data:", JSON.stringify(data, null, 2));
        this.packages = data.packages;
        this.comparisons = data.comparisons;
      }
    );
   console.log('Packages:', this.packages);
    console.log('Vergleiche:', this.comparisons);
  }

}
