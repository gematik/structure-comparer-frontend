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
 * Target Creation Service - Phase 7 Implementation
 *
 * Service for managing Target Creation entities - profile structures created WITHOUT source data.
 * Handles CRUD operations and field-level actions for Target Creations.
 *
 * Key Features:
 * - Create Target Creations from target profiles (no source required)
 * - Manage field actions (manual implementation or fixed values)
 * - Retrieve evaluation summaries
 *
 * Backend API Endpoints (9 total):
 * - GET    /project/{key}/target-creation                     → List
 * - GET    /project/{key}/target-creation/{id}                → Details
 * - POST   /project/{key}/target-creation                     → Create
 * - PATCH  /project/{key}/target-creation/{id}                → Update metadata
 * - DELETE /project/{key}/target-creation/{id}                → Delete
 * - GET    /project/{key}/target-creation/{id}/field          → List fields
 * - GET    /project/{key}/target-creation/{id}/field/{name}   → Get field
 * - PUT    /project/{key}/target-creation/{id}/field/{name}   → Set field action
 * - GET    /project/{key}/target-creation/{id}/evaluation/summary → Evaluation summary
 */

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  TargetCreationListItem,
  TargetCreationDetail,
  TargetCreationCreateInput,
  TargetCreationUpdateInput,
  TargetCreationField,
  TargetCreationFieldUpdate,
  TargetCreationEvaluationSummary,
  TargetCreationFieldsOutput
} from './models/target-creation.model';

@Injectable({
  providedIn: 'root'
})
export class TargetCreationService {
  // Base URL for API endpoints
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) { }

  // ============================================================================
  // CRUD Operations for Target Creations
  // ============================================================================

  /**
   * Retrieves all Target Creations in a project
   * @param projectKey The unique identifier of the project
   * @returns Observable containing the list of Target Creations
   */
  getTargetCreations(projectKey: string): Observable<TargetCreationListItem[]> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.get<TargetCreationListItem[]>(
      `${this.baseUrl}/project/${encodedProjectKey}/target-creation`
    ).pipe(catchError(this.handleError));
  }

  /**
   * Retrieves detailed information about a specific Target Creation
   * @param projectKey The unique identifier of the project
   * @param id The unique identifier of the Target Creation
   * @returns Observable containing the Target Creation details
   */
  getTargetCreation(projectKey: string, id: string): Observable<TargetCreationDetail> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedId = encodeURIComponent(id);
    return this.http.get<TargetCreationDetail>(
      `${this.baseUrl}/project/${encodedProjectKey}/target-creation/${encodedId}`
    ).pipe(catchError(this.handleError));
  }

  /**
   * Creates a new Target Creation in a project
   * @param projectKey The unique identifier of the project
   * @param input The creation input (target profile reference)
   * @returns Observable containing the created Target Creation ID
   */
  createTargetCreation(projectKey: string, input: TargetCreationCreateInput): Observable<{ id: string }> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.post<{ id: string }>(
      `${this.baseUrl}/project/${encodedProjectKey}/target-creation`,
      input
    ).pipe(catchError(this.handleError));
  }

  /**
   * Updates Target Creation metadata (status, version)
   * @param projectKey The unique identifier of the project
   * @param id The unique identifier of the Target Creation
   * @param input The update input (status, version, or target)
   * @returns Observable completing when update is done
   */
  updateTargetCreation(projectKey: string, id: string, input: TargetCreationUpdateInput): Observable<void> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedId = encodeURIComponent(id);
    return this.http.patch<void>(
      `${this.baseUrl}/project/${encodedProjectKey}/target-creation/${encodedId}`,
      input
    ).pipe(catchError(this.handleError));
  }

  /**
   * Deletes a Target Creation from a project
   * @param projectKey The unique identifier of the project
   * @param id The unique identifier of the Target Creation
   * @returns Observable completing when deletion is done
   */
  deleteTargetCreation(projectKey: string, id: string): Observable<void> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedId = encodeURIComponent(id);
    return this.http.delete<void>(
      `${this.baseUrl}/project/${encodedProjectKey}/target-creation/${encodedId}`
    ).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // Field Operations
  // ============================================================================

  /**
   * Retrieves all fields for a Target Creation
   * @param projectKey The unique identifier of the project
   * @param id The unique identifier of the Target Creation
   * @returns Observable containing the list of fields
   */
  getFields(projectKey: string, id: string): Observable<TargetCreationField[]> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedId = encodeURIComponent(id);
    return this.http.get<TargetCreationFieldsOutput>(
      `${this.baseUrl}/project/${encodedProjectKey}/target-creation/${encodedId}/field`
    ).pipe(
      catchError(this.handleError),
      // Extract fields array from wrapper object
      // Backend returns { fields: [...] }
      (response) => response.pipe(
        catchError((err) => throwError(err)),
        (obs) => new Observable(subscriber => {
          obs.subscribe({
            next: (data: any) => subscriber.next(data.fields || []),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete()
          });
        })
      )
    );
  }

  /**
   * Retrieves a specific field from a Target Creation
   * @param projectKey The unique identifier of the project
   * @param id The unique identifier of the Target Creation
   * @param fieldName The name of the field to retrieve
   * @returns Observable containing the field details
   */
  getField(projectKey: string, id: string, fieldName: string): Observable<TargetCreationField> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedId = encodeURIComponent(id);
    const encodedFieldName = encodeURIComponent(fieldName);
    return this.http.get<TargetCreationField>(
      `${this.baseUrl}/project/${encodedProjectKey}/target-creation/${encodedId}/field/${encodedFieldName}`
    ).pipe(catchError(this.handleError));
  }

  /**
   * Sets the action for a specific field in a Target Creation
   * @param projectKey The unique identifier of the project
   * @param id The unique identifier of the Target Creation
   * @param fieldName The name of the field to update
   * @param input The field update (action, fixed value, or remark)
   * @returns Observable completing when update is done
   */
  setField(projectKey: string, id: string, fieldName: string, input: TargetCreationFieldUpdate): Observable<void> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedId = encodeURIComponent(id);
    const encodedFieldName = encodeURIComponent(fieldName);
    return this.http.put<void>(
      `${this.baseUrl}/project/${encodedProjectKey}/target-creation/${encodedId}/field/${encodedFieldName}`,
      input
    ).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // Evaluation
  // ============================================================================

  /**
   * Retrieves the evaluation summary for a Target Creation
   * Includes status counts and field-level evaluation results
   * @param projectKey The unique identifier of the project
   * @param id The unique identifier of the Target Creation
   * @returns Observable containing the evaluation summary
   */
  getEvaluationSummary(projectKey: string, id: string): Observable<TargetCreationEvaluationSummary> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedId = encodeURIComponent(id);
    return this.http.get<TargetCreationEvaluationSummary>(
      `${this.baseUrl}/project/${encodedProjectKey}/target-creation/${encodedId}/evaluation/summary`
    ).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

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
        `body was: ${JSON.stringify(error.error)}`);
    }
    return throwError(
      () => new Error('Something bad happened; please try again later.')
    );
  }
}
