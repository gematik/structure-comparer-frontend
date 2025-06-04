
// Necessary class to manage the project data across the application without making redundant API calls
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PackageService {
  private baseUrl = 'http://127.0.0.1:8000';
  private currentProjectData: any;

  constructor(private http: HttpClient) { }

  createPackage(projectKey: string, packageFile: any): Observable<any> {
      
    const encodedProjectKey = encodeURIComponent(projectKey);
    const fileWithMime = new File([packageFile], packageFile.name, { type: 'application/gzip' });

    const formData = new FormData();
    formData.append('file', fileWithMime); // explizit als gzip markieren


    return this.http.post(
      `${this.baseUrl}/project/${encodedProjectKey}/package`,
      formData

    ).pipe(catchError(this.handleError));
  }

  updatePackage(projectKey: string, packageId: string, packageName: string): Observable<any> {
    const encodedPackageId = encodeURIComponent(packageId);
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.post(
      `${this.baseUrl}/project/${encodedProjectKey}/package/${encodedPackageId}`,
      {
        "display": packageName
      }
    ).pipe(catchError(this.handleError));
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

