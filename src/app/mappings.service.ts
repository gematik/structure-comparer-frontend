import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MappingsService {
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) { }

  getMapping(projectKey: string, mappingId: string): Observable<any> {
    const encodedMappingId = encodeURIComponent(mappingId);
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}`)
      .pipe(catchError(this.handleError));
  }

  getMappingDetail(mappingId: string): Observable<any> {
    const encodedMappingId = encodeURIComponent(mappingId);
    return this.http.get(`${this.baseUrl}/mapping/${encodedMappingId}`)
      .pipe(catchError(this.handleError));
  }

  getActions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/action`)
      .pipe(catchError(this.handleError));
  }

  getMappingFields(projectKey: string, mappingId: string): Observable<any> {
    const encodedMappingId = encodeURIComponent(mappingId);
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/field`)
      .pipe(catchError(this.handleError));
  }

  // Hier auf neues Vorgehen query umstellen. 
  updateMappingField(projectKey: string, mappingId: string, fieldId: string, action: string, updateData: { target?: string; value?: string }): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedMappingId = encodeURIComponent(mappingId);
    const encodedFieldId = encodeURIComponent(fieldId);
    const requestUrl = `${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/field/${encodedFieldId}`;
    const requestData = { action, ...updateData };
    console.log('Request data:', requestData);

    console.log('Sending request to:', requestUrl);
    console.log('Request data:', requestData);

    return this.http.post(requestUrl, requestData)
      .pipe(catchError(this.handleError));
  }

  listProjects(): Observable<any> {
    return this.http.get(`${this.baseUrl}/project`)
      .pipe(catchError(this.handleError));
  }

  initProject(projectURL: string): Observable<any> {
    return this.http.get(`${this.baseUrl}${projectURL}`)
      .pipe(catchError(this.handleError));
  }

  createProject(projectKey: string, projectName: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.post(`${this.baseUrl}/project/${encodedProjectKey}`, { name: projectName })
      .pipe(catchError(this.handleError));
  }



  //
  addMapping(mappingData: any): Observable<any> {

    return this.http.post(`${this.baseUrl}/mappings`, mappingData)
      .pipe(catchError(this.handleError));
  }

  updateMapping(mappingId: string, mappingData: any): Observable<any> {
    const encodedMappingId = encodeURIComponent(mappingId);
    return this.http.put(`${this.baseUrl}/mappings/${encodedMappingId}`, mappingData)
      .pipe(catchError(this.handleError));
  }

  deleteMapping(mappingId: string): Observable<any> {
    const encodedMappingId = encodeURIComponent(mappingId);
    return this.http.delete(`${this.baseUrl}/mappings/${encodedMappingId}`)
      .pipe(catchError(this.handleError));
  }

  //temp
  getStaticMapping(projectKey: string, mappingId: string, showRemarks: boolean, showWarnings: boolean): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedMappingId = encodeURIComponent(mappingId);
    let params = new HttpParams()
      .set('show_remarks', showRemarks)
      .set('show_warnings', showWarnings);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/html`, { params, responseType: 'blob' })
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
