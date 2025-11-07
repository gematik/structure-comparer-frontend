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
 * Service to manage profile comparison operations
 * Handles creating, retrieving, and deleting profile comparisons
 * Also provides utility methods for field classification descriptions
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ComparisonService {
  // Base URL for API endpoints
  private baseUrl = 'http://127.0.0.1:8000';
  // Cached project data (might be unused in this service)
  private currentProjectData: any;

  constructor(private http: HttpClient) { }

  /**
   * Retrieves comparison data for a specific comparison
   * @param projectKey The unique identifier of the project
   * @param comparisonId The unique identifier of the comparison
   * @returns Observable containing the comparison data
   */
  getComparisonData(projectKey: string, comparisonId: string): Observable<any> {
    const encodedComparisonId = encodeURIComponent(comparisonId);
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/comparison/${encodedComparisonId}`);
  }

  /**
   * Creates a new comparison between profiles
   * @param projectKey The unique identifier of the project
   * @param comparisonData The comparison configuration data
   * @returns Observable containing the creation response
   */
  createComparison(projectKey: string, comparisonData: any): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.post(`${this.baseUrl}/project/${encodedProjectKey}/comparison`, comparisonData);
  }

  /**
   * Deletes a specific comparison
   * @param projectKey The unique identifier of the project
   * @param comparisonId The unique identifier of the comparison to delete
   * @returns Observable containing the deletion response
   */
  deleteComparison(projectKey: string, comparisonId: string): Observable<any> {
    const encodedComparisonId = encodeURIComponent(comparisonId);
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.delete(`${this.baseUrl}/project/${encodedProjectKey}/comparison/${encodedComparisonId}`);
  }

  /**
   * Provides human-readable descriptions for field classification results
   * @param field The field object containing classification and issues
   * @returns A descriptive string explaining the classification
   */
  getClassificationDescription(field: any): string {
    switch (field.classification) {
      case 'compatible':
        return 'This field is compatible between source and target.';
      case 'warning':
        if (field.issues && field.issues.length > 0) {
          return `The following elements lead to a warning: ${field.issues.join(', ')}.`;
        } else {
          return 'Warning: differences may cause issues.';
        }
      case 'incompatible':
        if (field.issues && field.issues.length > 0) {
          return `The following elements cause incompatibility: ${field.issues.join(', ')}.`;
        }
        return 'Incompatible: the target is more restrictive than the source.';
      default:
        return 'No additional information available.';
    }
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

