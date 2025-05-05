
// Necessary class to manage the project data across the application without making redundant API calls
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ComparisonService {
  private baseUrl = 'http://127.0.0.1:8000';
  private currentProjectData: any;

  constructor(private http: HttpClient) { }

  getComparisonData(projectKey: string, comparisonId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/project/${projectKey}/comparison/${comparisonId}`) ;
  }

  // Hier überlegen, ob ich ComparisonData nicht vielleicht erst hier zusammenbaue?!
  createComparison(projectKey: string, comparisonData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/project/${projectKey}/comparison`, comparisonData);
  }

 
  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    return throwError(
      'Something bad happened; please try again later.');
  }
}

