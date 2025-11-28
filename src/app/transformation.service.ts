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
 * Service to manage transformation-related operations
 * Handles CRUD operations for transformations and their fields
 */
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Transformation,
  TransformationCreate,
  TransformationCreateRequest,
  TransformationUpdateRequest,
  TransformationFieldUpdateRequest,
  TransformationMappingLinkRequest,
  TransformationField
} from './models/transformation.model';

@Injectable({
  providedIn: 'root'
})
export class TransformationService {
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) { }

  /**
   * Retrieves all transformations for a project
   * @param projectKey The unique identifier of the project
   * @returns Observable containing the list of transformations
   */
  getTransformations(projectKey: string): Observable<Transformation[]> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.get<Transformation[]>(
      `${this.baseUrl}/project/${encodedProjectKey}/transformation`
    ).pipe(catchError(this.handleError));
  }

  /**
   * Retrieves a specific transformation
   * @param projectKey The unique identifier of the project
   * @param transformationId The unique identifier of the transformation
   * @returns Observable containing the transformation details
   */
  getTransformation(projectKey: string, transformationId: string): Observable<Transformation> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedTransformationId = encodeURIComponent(transformationId);
    return this.http.get<Transformation>(
      `${this.baseUrl}/project/${encodedProjectKey}/transformation/${encodedTransformationId}`
    ).pipe(catchError(this.handleError));
  }

  /**
   * Creates a new transformation
   * @param projectKey The unique identifier of the project
   * @param data The transformation creation data
   * @returns Observable containing the created transformation
   */
  createTransformation(projectKey: string, data: TransformationCreate | TransformationCreateRequest): Observable<Transformation> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.post<Transformation>(
      `${this.baseUrl}/project/${encodedProjectKey}/transformation`,
      data
    ).pipe(catchError(this.handleError));
  }

  /**
   * Updates a transformation
   * @param projectKey The unique identifier of the project
   * @param transformationId The unique identifier of the transformation
   * @param data The update data
   * @returns Observable containing the updated transformation
   */
  updateTransformation(
    projectKey: string,
    transformationId: string,
    data: TransformationUpdateRequest
  ): Observable<Transformation> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedTransformationId = encodeURIComponent(transformationId);
    return this.http.patch<Transformation>(
      `${this.baseUrl}/project/${encodedProjectKey}/transformation/${encodedTransformationId}`,
      data
    ).pipe(catchError(this.handleError));
  }

  /**
   * Deletes a transformation
   * @param projectKey The unique identifier of the project
   * @param transformationId The unique identifier of the transformation
   * @returns Observable containing the deletion result
   */
  deleteTransformation(projectKey: string, transformationId: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedTransformationId = encodeURIComponent(transformationId);
    return this.http.delete(
      `${this.baseUrl}/project/${encodedProjectKey}/transformation/${encodedTransformationId}`
    ).pipe(catchError(this.handleError));
  }

  /**
   * Retrieves all fields for a transformation
   * @param projectKey The unique identifier of the project
   * @param transformationId The unique identifier of the transformation
   * @returns Observable containing the transformation fields
   */
  getTransformationFields(projectKey: string, transformationId: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedTransformationId = encodeURIComponent(transformationId);
    return this.http.get(
      `${this.baseUrl}/project/${encodedProjectKey}/transformation/${encodedTransformationId}/field`
    ).pipe(catchError(this.handleError));
  }

  /**
   * Updates a transformation field
   * @param projectKey The unique identifier of the project
   * @param transformationId The unique identifier of the transformation
   * @param fieldName The name of the field to update
   * @param data The field update data
   * @returns Observable containing the updated field
   */
  updateTransformationField(
    projectKey: string,
    transformationId: string,
    fieldName: string,
    data: TransformationFieldUpdateRequest
  ): Observable<TransformationField> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedTransformationId = encodeURIComponent(transformationId);
    const encodedFieldName = encodeURIComponent(fieldName);
    return this.http.put<TransformationField>(
      `${this.baseUrl}/project/${encodedProjectKey}/transformation/${encodedTransformationId}/field/${encodedFieldName}`,
      data
    ).pipe(catchError(this.handleError));
  }

  /**
   * Links a mapping to a transformation field
   * @param projectKey The unique identifier of the project
   * @param transformationId The unique identifier of the transformation
   * @param fieldName The name of the field
   * @param data The link data containing the mapping ID
   * @returns Observable containing the updated field
   */
  linkMapping(
    projectKey: string,
    transformationId: string,
    fieldName: string,
    data: TransformationMappingLinkRequest
  ): Observable<TransformationField> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedTransformationId = encodeURIComponent(transformationId);
    const encodedFieldName = encodeURIComponent(fieldName);
    return this.http.post<TransformationField>(
      `${this.baseUrl}/project/${encodedProjectKey}/transformation/${encodedTransformationId}/field/${encodedFieldName}/link-mapping`,
      data
    ).pipe(catchError(this.handleError));
  }

  /**
   * Unlinks a mapping from a transformation field
   * @param projectKey The unique identifier of the project
   * @param transformationId The unique identifier of the transformation
   * @param fieldName The name of the field
   * @returns Observable containing the updated field
   */
  unlinkMapping(
    projectKey: string,
    transformationId: string,
    fieldName: string
  ): Observable<TransformationField> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedTransformationId = encodeURIComponent(transformationId);
    const encodedFieldName = encodeURIComponent(fieldName);
    return this.http.delete<TransformationField>(
      `${this.baseUrl}/project/${encodedProjectKey}/transformation/${encodedTransformationId}/field/${encodedFieldName}/link-mapping`
    ).pipe(catchError(this.handleError));
  }

  /**
   * Error handler for HTTP requests
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Server returned code ${error.status}: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
