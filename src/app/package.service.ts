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
 * Service to manage package-related operations
 * Handles package creation, updates, and API communications
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PackageService {
  // Base URL for API endpoints
  private baseUrl = 'http://127.0.0.1:8000';
  // Cached project data (might be unused in this service)
  private currentProjectData: any;

  constructor(private http: HttpClient) { }

  /**
   * Creates a new package by uploading a package file
   * @param projectKey The unique identifier of the project
   * @param packageFile The package file to upload (typically a .tgz file)
   * @returns Observable containing the creation response
   */
  createPackage(projectKey: string, packageFile: any): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    // Explicitly set MIME type to gzip for proper handling
    const fileWithMime = new File([packageFile], packageFile.name, { type: 'application/gzip' });

    const formData = new FormData();
    formData.append('file', fileWithMime);

    return this.http.post(
      `${this.baseUrl}/project/${encodedProjectKey}/package`,
      formData
    ).pipe(catchError(this.handleError));
  }

  /**
   * Updates the display name of an existing package
   * @param projectKey The unique identifier of the project
   * @param packageId The unique identifier of the package to update
   * @param packageName The new display name for the package
   * @returns Observable containing the update response
   */
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

