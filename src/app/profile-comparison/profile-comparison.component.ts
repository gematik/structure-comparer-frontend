import { Component, OnInit } from '@angular/core';
import { ComparisonService } from '../comparison.service';
import { ActivatedRoute } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableDataSource } from '@angular/material/table';



@Component({
  selector: 'app-profile-comparison',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatExpansionModule,
  MatTableDataSource],
  templateUrl: './profile-comparison.component.html',
  styleUrl: './profile-comparison.component.css'
})
export class ProfileComparisonComponent implements OnInit {
  projectKey: string;
  comparisonId: string;
  comparison: any;
  // Paginator
  totalLength: number = 0;
  pageSize: number = 200;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 50, 100, 200, 500];
  originalFields: any[] = [];
  displayedColumns: string[] = ['name', 'classification']; // anpassen je nach Spalten
dataSource = new MatTableDataSource<any>();
expandedElement: any | null = null;


  constructor(private route: ActivatedRoute, private comparisonService: ComparisonService) { this.projectKey = ""; this.comparisonId = ""; }

  ngOnInit(): void {
    this.projectKey = this.route.snapshot.paramMap.get('projectKey') || '';
    this.comparisonId = this.route.snapshot.paramMap.get('comparisonId') || '';
    console.log("ProjectKey: ", this.projectKey)
    console.log("ComparisonId: ", this.comparisonId)
    if (this.projectKey && this.comparisonId) {
      console.log("Test")
      this.loadComparison(this.projectKey, this.comparisonId);
    }
  }

  loadComparison(projectKey: string, comparisonId: string) {
    this.comparisonService
      .getComparisonData(projectKey, comparisonId)
      .pipe(
        catchError((err) => {
          console.error('Error loading mapping detail', err);
          return of({});
        })
      )
      .subscribe((comparison) => {
        console.log('comparison', comparison);
        this.comparison = comparison;
        this.originalFields = [...comparison.fields];

      });

  }

  loadComparisonCSSProperty(compatibility: string): string {
    const CSS_CLASS: { [key: string]: string } = {
      compatible: 'compatible',
      warning: 'warning',
      incompatible: 'incompatible',
    };
    return CSS_CLASS[compatibility] || '';
  }

  filterComparisonFields(event: Event): void {
    const input = (event.target as HTMLInputElement).value.trim().toLowerCase();

    this.comparison.fields = this.originalFields.filter(field => {
      const name = field.name?.toLowerCase() ?? '';
      const classification = field.classification?.toLowerCase() ?? '';
      return name.includes(input) || classification.includes(input);
    });
  }
}
