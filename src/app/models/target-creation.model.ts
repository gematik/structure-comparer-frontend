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
 * Target Creation Models - Phase 6 Implementation
 *
 * Target Creations represent profile structures that are created WITHOUT source data.
 * Only 'manual' and 'fixed' actions are allowed (no use, copy_value_from, etc.)
 *
 * Key Differences from Mappings:
 * - No source profiles
 * - Restricted action set (manual, fixed only)
 * - No inheritance (use_recursive)
 * - No recommendations
 * - Different status counts: action_required, resolved, optional_pending
 */

import { ActionInfo, EvaluationResult } from './mapping-evaluation.model';

/**
 * Available actions for Target Creation fields
 * Restricted subset compared to Mappings - only manual definition or fixed values allowed
 */
export type TargetCreationAction = 'manual' | 'fixed';

/**
 * Profile information shared across models
 */
export interface ProfileInfo {
  name: string;
  url: string;
  version: string;
  webUrl?: string;
  package?: string;
}

/**
 * Profile reference for creating new Target Creations
 */
export interface ProfileReference {
  url: string;
  version: string;
  webUrl?: string;
  package?: string;
}

/**
 * Status counts specific to Target Creations
 * Different from Mappings (incompatible/warning/solved/compatible)
 */
export interface TargetCreationStatusCounts {
  // Total number of fields
  total: number;
  // Fields that require action (mandatory fields with min > 0 and no action set)
  action_required: number;
  // Fields with action defined (manual or fixed)
  resolved: number;
  // Optional fields without action (min = 0, no action needed)
  optional_pending: number;
}

/**
 * Field in a Target Creation
 * Similar to MappingField but without source-related properties
 */
export interface TargetCreationField {
  // Field name/path
  name: string;
  // Field data types
  types: string[];
  // Minimum cardinality
  min: number;
  // Maximum cardinality (* for unbounded)
  max: string;
  // Extension URL if this is an extension field
  extension?: string;
  // Field description
  description?: string;
  // Allowed actions (always ['manual', 'fixed'] for Target Creation)
  actions_allowed: TargetCreationAction[];
  // Current action (manual or fixed)
  action?: TargetCreationAction | null;
  // Fixed value (when action=fixed)
  fixed?: string | null;
  // Remark (when action=manual)
  remark?: string | null;
  // Detailed action metadata from backend
  action_info?: ActionInfo;
  // Evaluation result from backend
  evaluation?: EvaluationResult;
}

/**
 * Minimal field update payload for setting field actions
 * Used when updating a single field via PUT /field/{name}
 */
export interface TargetCreationFieldUpdate {
  // Action to set (required)
  action: TargetCreationAction;
  // Fixed value (required when action='fixed')
  fixed?: string;
  // Implementation remark (optional for action='manual')
  remark?: string;
}

/**
 * List item representation for Target Creation overview
 * Used in project edit view and list components
 */
export interface TargetCreationListItem {
  // Unique identifier
  id: string;
  // Human-readable name
  name: string;
  // Canonical URL
  url: string;
  // Version string
  version: string;
  // Status (draft, active, deprecated)
  status: string;
  // Target profile information
  target: ProfileInfo;
  // Status counts (as direct fields in list endpoint)
  total: number;
  action_required: number;
  resolved: number;
  optional_pending: number;
  // Last update timestamp
  last_updated: string;
}

/**
 * Detailed Target Creation with all fields
 * Used in detail view component
 */
export interface TargetCreationDetail {
  // Unique identifier
  id: string;
  // Human-readable name
  name: string;
  // Canonical URL
  url: string;
  // Version string
  version: string;
  // Status (draft, active, deprecated)
  status: string;
  // Target profile information
  target: ProfileInfo;
  // All fields with their actions and evaluations
  fields: TargetCreationField[];
  // Status counts (as direct fields)
  total: number;
  action_required: number;
  resolved: number;
  optional_pending: number;
  // Last update timestamp
  last_updated: string;
}

/**
 * Input for creating a new Target Creation
 * Only target profile ID is required - fields are auto-generated from profile
 */
export interface TargetCreationCreateInput {
  // Target profile ID from packages
  target_id: string;
}

/**
 * Input for updating Target Creation metadata
 * All fields are optional - only provided fields are updated
 */
export interface TargetCreationUpdateInput {
  // New status
  status?: string;
  // New version
  version?: string;
  // New target profile (rarely changed)
  target?: ProfileReference;
}

/**
 * Evaluation summary for Target Creation
 * Provides aggregated status information
 */
export interface TargetCreationEvaluationSummary {
  // Target Creation identifier
  target_creation_id: string;
  // Target Creation name
  target_creation_name: string;
  // Status counts
  status_counts: TargetCreationStatusCounts;
  // Field-level evaluation results
  field_evaluations: Record<string, EvaluationResult>;
}

/**
 * Response from fields list endpoint
 */
export interface TargetCreationFieldsOutput {
  fields: TargetCreationField[];
}
