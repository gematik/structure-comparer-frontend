import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as tslib_1 from "tslib"; 

@Injectable({
  providedIn: 'root'
})
export class MappingsService {
  private baseUrl = 'http://127.0.0.1:5000';

  constructor(private http: HttpClient) { }

  getMappings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/mappings`)
      .pipe(catchError(this.handleError));
  }

  getMappingDetail(mappingId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/mapping/${mappingId}`)
      .pipe(catchError(this.handleError));
  }

  getClassifications(): Observable<any> {
    return this.http.get(`${this.baseUrl}/classification`)
      .pipe(catchError(this.handleError));
  }

  getMappingFields(mappingId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/mapping/${mappingId}/fields`)
      .pipe(catchError(this.handleError));
  }

  updateMappingField(mappingId: string, fieldId: string, action: string, updateData: { target?: string; value?: string }): Observable<any> {
    const requestUrl = `${this.baseUrl}/mapping/${mappingId}/field/${fieldId}/classification`;
    const requestData = { action, ...updateData };
    
    console.log('Sending request to:', requestUrl);
    console.log('Request data:', requestData);
    
    return this.http.post(requestUrl, requestData)
      .pipe(catchError(this.handleError));
  }

  listProjects(): Observable<any> {
    return this.http.get(`${this.baseUrl}/projects`)
      .pipe(catchError(this.handleError));
  }

  initProject(projectName: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/init_project`, { project_name: projectName })
      .pipe(catchError(this.handleError));
  }

  createProject(projectName: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/create_project`, { project_name: projectName })
      .pipe(catchError(this.handleError));
  }

  addMapping(mappingData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/mappings`, mappingData)
      .pipe(catchError(this.handleError));
  }

  updateMapping(mappingId: string, mappingData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/mappings/${mappingId}`, mappingData)
      .pipe(catchError(this.handleError));
  }

  deleteMapping(mappingId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/mappings/${mappingId}`)
      .pipe(catchError(this.handleError));
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