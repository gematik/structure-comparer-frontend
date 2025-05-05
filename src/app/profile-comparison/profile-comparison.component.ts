import { Component, OnInit } from '@angular/core';
import { ComparisonService } from '../comparison.service';
import { ActivatedRoute } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';


@Component({
  selector: 'app-profile-comparison',
  standalone: true,
  imports: [],
  templateUrl: './profile-comparison.component.html',
  styleUrl: './profile-comparison.component.css'
})
export class ProfileComparisonComponent implements OnInit {
  projectKey: string;
  comparisonId: string;

  constructor(private route: ActivatedRoute,private comparisonService: ComparisonService) { this.projectKey = ""; this.comparisonId = "";}

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
          
          
          
        });
        
    }

}
