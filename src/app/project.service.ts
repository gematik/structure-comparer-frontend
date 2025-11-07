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
 * Service to manage project data and API communications
 * Handles project-related HTTP requests and caches current project data
 * to avoid redundant API calls across the application
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  // Base URL for API endpoints
  private baseUrl = 'http://127.0.0.1:8000';
  // Cached project data to avoid redundant API calls
  private currentProjectData: any;

  constructor(private http: HttpClient) { }

  /**
   * Stores project data in memory for quick access
   * @param data The project data to cache
   */
  setProjectData(data: any) {
    this.currentProjectData = data;
  }

  /**
   * Retrieves the currently cached project data
   * @returns The cached project data or null if none exists
   */
  getProjectData() {
    return this.currentProjectData;
  }

  /**
   * Clears the cached project data
   */
  clearProjectData() {
    this.currentProjectData = null;
  }

  /**
   * Fetches all profiles for a specific project
   * @param projectKey The unique identifier of the project
   * @returns Observable containing the project's profiles
   */
  getProjectProfiles(projectKey: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/profile`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Reloads project data from the server
   * @param projectKey The unique identifier of the project to reload
   * @returns Observable containing the updated project data
   */
  reloadProjectData(projectKey: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey); 
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}`)
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

