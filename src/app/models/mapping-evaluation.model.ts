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
 * Interfaces for enhanced mapping evaluation data structures
 */

export interface EvaluationIssue {
  issue_type: string;
  severity: string;
  message: string;
  resolved_by_action?: string;
  requires_attention: boolean;
}

export interface FieldEvaluation {
  field_name: string;
  original_classification: string;
  enhanced_classification: string;
  action: string;
  issues: EvaluationIssue[];
  warnings: string[];
  recommendations: string[];
  processing_status?: string;
}

export interface MappingEvaluation {
  mapping_id: string;
  mapping_name: string;
  field_evaluations: { [key: string]: FieldEvaluation };
  summary: MappingEvaluationSummary;
}

export interface MappingEvaluationSummary {
  total_fields: number;
  compatible: number;
  warnings: number;
  incompatible: number;
  action_resolved: number;
  action_mitigated: number;
  needs_attention: number;
}

export interface EnhancedMappingField {
  // Original field properties
  name: string;
  action: string;
  classification: string;
  profiles: any;
  remark?: string;
  issues?: string[];

  // Enhanced evaluation properties
  evaluation?: FieldEvaluation;
  enhancedTooltip?: string;
  cssClass?: string;
}
