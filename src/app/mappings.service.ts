/*
 *
 * Copyright 2025 gematik GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * *******
 *
 * For additional notes and disclaimer from gematik and in case of changes by gematik find details in the "Readme" file.
 */
/**
 * Service to manage mapping-related operations and project management
 * Handles CRUD operations for mappings, projects, and their fields
 */
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MappingsService {
  // Base URL for API endpoints
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) { }

  /**
   * Retrieves a specific mapping within a project
   * @param projectKey The unique identifier of the project
   * @param mappingId The unique identifier of the mapping
   * @returns Observable containing the mapping data
   */
  getMapping(projectKey: string, mappingId: string): Observable<any> {
    const encodedMappingId = encodeURIComponent(mappingId);
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Retrieves detailed information about a mapping
   * @param mappingId The unique identifier of the mapping
   * @returns Observable containing the mapping details
   */
  getMappingDetail(mappingId: string): Observable<any> {
    const encodedMappingId = encodeURIComponent(mappingId);
    return this.http.get(`${this.baseUrl}/mapping/${encodedMappingId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Retrieves all available actions for mappings
   * @returns Observable containing the list of available actions
   */
  getActions(): Observable<any> {
    const actions = this.http.get(`${this.baseUrl}/action`)
      .pipe(catchError(this.handleError));
    return actions;
  }

  /**
   * Retrieves all fields for a specific mapping
   * @param projectKey The unique identifier of the project
   * @param mappingId The unique identifier of the mapping
   * @returns Observable containing the mapping fields
   */
  getMappingFields(projectKey: string, mappingId: string): Observable<any> {
    const encodedMappingId = encodeURIComponent(mappingId);
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/field`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Updates a specific field in a mapping with an action and data
   * @param projectKey The unique identifier of the project
   * @param mappingId The unique identifier of the mapping
   * @param fieldId The unique identifier of the field to update
   * @param action The action to perform on the field
   * @param updateData Object containing target and/or value properties for the update
   * @returns Observable containing the update response
   */
  updateMappingField(projectKey: string, mappingId: string, fieldId: string, action: string, updateData: { target?: string; value?: string }): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedMappingId = encodeURIComponent(mappingId);
    const encodedFieldId = encodeURIComponent(fieldId);
    const requestUrl = `${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/field/${encodedFieldId}`;
    const requestData = { action, ...updateData };
    return this.http.post(requestUrl, requestData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Updates a mapping field with the new action configuration
   * @param projectKey The unique identifier of the project
   * @param mappingId The unique identifier of the mapping
   * @param fieldName The name of the field to update
   * @param updateRequest The update request with action and additional data
   * @returns Observable containing the updated field data
   */
  updateMappingFieldAction(projectKey: string, mappingId: string, fieldName: string, updateRequest: any): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedMappingId = encodeURIComponent(mappingId);
    const encodedFieldName = encodeURIComponent(fieldName);
    const requestUrl = `${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/field/${encodedFieldName}`;

    return this.http.post(requestUrl, updateRequest)
      .pipe(catchError(this.handleError));
  }

  /**
   * Retrieves a list of all projects
   * @returns Observable containing the list of projects
   */
  listProjects(): Observable<any> {
    return this.http.get(`${this.baseUrl}/project`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Initializes a project using a provided URL
   * @param projectURL The URL path for the project initialization
   * @returns Observable containing the initialization response
   */
  initProject(projectURL: string): Observable<any> {
    return this.http.get(`${this.baseUrl}${projectURL}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Creates a new project with the specified key and name
   * @param projectKey The unique identifier for the new project
   * @param projectName The display name for the new project
   * @returns Observable containing the creation response
   */
  createProject(projectKey: string, projectName: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.post(`${this.baseUrl}/project/${encodedProjectKey}`, { name: projectName })
      .pipe(catchError(this.handleError));
  }

  /**
   * Deletes a project
   * @param projectKey The unique identifier of the project to delete
   * @returns Observable containing the deletion response
   */
  deleteProject(projectKey: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.delete(`${this.baseUrl}/project/${encodedProjectKey}`)
      .pipe(catchError(this.handleError));
  }




  /**
   * Adds a new mapping to a project
   * @param projectKey The unique identifier of the project
   * @param mappingData The data for the new mapping
   * @returns Observable containing the creation response
   */
  addMapping(projectKey: string, mappingData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/project/${projectKey}/mapping`, mappingData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Updates an existing mapping
   * @param mappingId The unique identifier of the mapping to update
   * @param mappingData The updated mapping data
   * @returns Observable containing the update response
   */
  updateMapping(mappingId: string, mappingData: any): Observable<any> {
    const encodedMappingId = encodeURIComponent(mappingId);
    return this.http.put(`${this.baseUrl}/mappings/${encodedMappingId}`, mappingData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Deletes a mapping
   * @param mappingId The unique identifier of the mapping to delete
   * @returns Observable containing the deletion response
   */
  deleteMapping(projectId: string, mappingId: string): Observable<any> {
    const encodedProjectId = encodeURIComponent(projectId);
    const encodedMappingId = encodeURIComponent(mappingId);
    return this.http.delete(`${this.baseUrl}/project/${encodedProjectId}/mapping/${encodedMappingId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Retrieves a static HTML representation of a mapping
   * @param projectKey The unique identifier of the project
   * @param mappingId The unique identifier of the mapping
   * @param showRemarks Whether to include remarks in the output
   * @param showWarnings Whether to include warnings in the output
   * @returns Observable containing the HTML blob response
   */
  getStaticMapping(projectKey: string, mappingId: string, showRemarks: boolean, showWarnings: boolean): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedMappingId = encodeURIComponent(mappingId);
    let params = new HttpParams()
      .set('show_remarks', showRemarks.toString())
      .set('show_warnings', showWarnings.toString());
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/html`, { params, responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  /**
   * Retrieves mapping evaluation summary with counts for different categories
   * @param projectKey The unique identifier of the project
   * @param mappingId The unique identifier of the mapping
   * @returns Observable containing the evaluation summary with counts
   */
  getMappingEvaluationSummary(projectKey: string, mappingId: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedMappingId = encodeURIComponent(mappingId);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/evaluation/summary`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Handles HTTP errors and provides user-friendly error messages
   * @param error The HTTP error response
   * @returns Observable error with formatted message
   */
  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      console.error('An error occurred:', error.error.message);
    } else {
      // Server-side error
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    return throwError(
      'Something bad happened; please try again later.');
  }
}
