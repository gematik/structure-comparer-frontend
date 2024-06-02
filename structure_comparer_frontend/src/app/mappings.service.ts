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

  getMappingFields(mappingId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/mapping/${mappingId}/fields`)
      .pipe(catchError(this.handleError));
  }

  updateMappingField(mappingId: string, fieldId: string, updateData: { target?: string; fixed?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/mapping/${mappingId}/field/${fieldId}`, updateData)
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