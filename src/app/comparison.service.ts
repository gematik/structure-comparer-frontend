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
   * Gets enhanced mapping evaluation data for a specific mapping
   * @param projectKey The unique identifier of the project
   * @param mappingId The unique identifier of the mapping
   * @returns Observable containing the enhanced evaluation data
   */
  getMappingEvaluation(projectKey: string, mappingId: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedMappingId = encodeURIComponent(mappingId);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/evaluation`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Gets evaluation summary for a specific mapping
   * @param projectKey The unique identifier of the project
   * @param mappingId The unique identifier of the mapping
   * @returns Observable containing the evaluation summary
   */
  getMappingEvaluationSummary(projectKey: string, mappingId: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedMappingId = encodeURIComponent(mappingId);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/evaluation/summary`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Gets enhanced evaluation for a specific field in a mapping
   * @param projectKey The unique identifier of the project
   * @param mappingId The unique identifier of the mapping
   * @param fieldName The name of the field
   * @returns Observable containing the field evaluation
   */
  getFieldEvaluation(projectKey: string, mappingId: string, fieldName: string): Observable<any> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    const encodedMappingId = encodeURIComponent(mappingId);
    const encodedFieldName = encodeURIComponent(fieldName);
    return this.http.get(`${this.baseUrl}/project/${encodedProjectKey}/mapping/${encodedMappingId}/field/${encodedFieldName}/evaluation`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Provides human-readable descriptions for field classification results
   * Enhanced version that considers mapping actions and evaluation results
   * @param field The field object containing classification and issues
   * @param evaluation Optional enhanced evaluation data
   * @returns A descriptive string explaining the classification
   */
  getClassificationDescription(field: any, evaluation?: any): string {
    // Use enhanced evaluation if available
    if (evaluation) {
      return this.getEnhancedClassificationDescription(evaluation);
    }

    // Fallback to original logic
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
   * Provides enhanced descriptions based on mapping evaluation results
   * @param evaluation The enhanced evaluation data
   * @returns A descriptive string explaining the enhanced classification
   */
  getEnhancedClassificationDescription(evaluation: any): string {
    const messages: string[] = [];

    // Add main classification message
    switch (evaluation.enhanced_classification) {
      case 'compatible':
        messages.push('This field is compatible between source and target.');
        break;
      case 'warning':
        messages.push('Warning: This field may cause issues during mapping.');
        break;
      case 'incompatible':
        messages.push('Incompatible: This field cannot be mapped as specified.');
        break;
      case 'action_resolved':
        messages.push(`Resolved: Issues handled by ${evaluation.action} action.`);
        break;
      case 'action_mitigated':
        messages.push(`Mitigated: Issues addressed by ${evaluation.action} action (requires attention).`);
        break;
    }

    // Add specific issue messages
    if (evaluation.issues && evaluation.issues.length > 0) {
      const issueMessages = evaluation.issues
        .filter((issue: any) => issue.requires_attention)
        .map((issue: any) => issue.message);

      if (issueMessages.length > 0) {
        messages.push(...issueMessages);
      }
    }

    // Add warnings
    if (evaluation.warnings && evaluation.warnings.length > 0) {
      messages.push(...evaluation.warnings);
    }

    // Add recommendations
    if (evaluation.recommendations && evaluation.recommendations.length > 0) {
      messages.push('Recommendations: ' + evaluation.recommendations.join('; '));
    }

    return messages.join(' ');
  }

  /**
   * Gets CSS class for enhanced classification
   * @param classification The enhanced classification type
   * @returns CSS class name for styling
   */
  getEnhancedClassificationCssClass(classification: string): string {
    const cssClasses: { [key: string]: string } = {
      'compatible': 'compatible',
      'warning': 'warning',
      'incompatible': 'incompatible',
      'action_resolved': 'action-resolved',
      'action_mitigated': 'action-mitigated'
    };
    return cssClasses[classification] || 'unknown';
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

