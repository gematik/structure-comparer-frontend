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
import { ActionInfo, EvaluationResult } from './mapping-evaluation.model';

/**
 * Interface representing a source profile in a mapping
 */
export interface SourceProfile {
  // Name of the source profile
  name: string;
  // URL to the profile on Simplifier or other platform
  simplifier_url: string;
  // Version of the source profile
  version: string;
}

/**
 * Interface representing a target profile in a mapping
 */
export interface TargetProfile {
  // Name of the target profile
  name: string;
  // URL to the profile on Simplifier or other platform
  simplifier_url: string;
  // Version of the target profile
  version: string;
}

/**
 * Available actions for mapping fields
 * null indicates no action has been selected yet (user must decide)
 */
export type MappingAction =
  | 'use'
  | 'use_recursive'
  | 'not_use'
  | 'empty'
  | 'copy_from'
  | 'copy_to'
  | 'fixed'
  | 'manual'
  | null;

/**
 * Interface representing an action option with metadata
 */
export interface ActionOption {
  // The action value (e.g., "use", "copy_from")
  value: MappingAction;
  // Human-readable description of the action
  description: string;
  // Optional additional instruction text
  instruction?: string;
}

/**
 * Interface representing profile information for a field
 */
export interface FieldProfile {
  // Minimum cardinality
  min: number | string;
  // Maximum cardinality (* for unbounded)
  max: number | string;
  // Whether the field is must support
  must_support?: boolean;
  // Referenced types for the field
  ref_types?: string[];
}

/**
 * Interface representing a mapping field/property
 */
export interface MappingField {
  // Field name/path
  name: string;
  // Current action set for this field (null = no action selected yet)
  action: MappingAction | null;
  // Available actions for this field
  actions_allowed: MappingAction[];
  // Classification of field compatibility
  classification: string;
  // Profile-specific information
  profiles?: { [profileKey: string]: FieldProfile };
  // Extension information if applicable
  extension?: string;
  // Additional extra information
  extra?: string;
  // Remark text for manual actions
  remark?: string;
  // Target field for copy actions
  other?: string;
  // Fixed value for fixed actions
  fixed?: string;
  // Whether to show mapping content or only recommendations
  show_mapping_content?: boolean;
  // Whether this field was automatically generated from parent action
  auto_generated?: boolean;
  // Parent field name if this field was inherited from a parent action
  inherited_from?: string | null;
  // Detailed action metadata supplied by the backend
  action_info?: ActionInfo | null;
  // Evaluation result supplied by the backend
  evaluation?: EvaluationResult | null;
  // Recommended action that has NOT been applied yet (does not influence status)
  recommendation?: ActionInfo | null;
}

/**
 * Request payload for updating a mapping field
 * Note: action must be set when updating (cannot be null)
 * Users must explicitly select an action before saving
 */
export interface MappingFieldUpdateRequest {
  // The action to set (required, cannot be null when updating)
  action: MappingAction;
  // Target field for copy actions
  other?: string;
  // Fixed value for fixed actions
  fixed?: string;
  // Remark for manual actions
  remark?: string;
  // Whether this field was automatically generated from parent action
  auto_generated?: boolean;
  // Parent field name if this field was inherited from a parent action
  inherited_from?: string | null;
}

/**
 * Interface representing a mapping between source and target profiles
 * Used for defining transformations and field mappings
 */
export interface Mapping {
  // Unique identifier for the mapping
  id: string;
  // Timestamp of when the mapping was last updated
  last_updated: string;
  // Human-readable name of the mapping
  name: string;
  // Array of source profiles involved in the mapping
  sources: SourceProfile[];
  // Current status of the mapping (e.g., draft, active, retired)
  status: string;
  // Target profile for the mapping
  target: TargetProfile;
  // Version of the mapping definition
  version: string;
  // Status counts calculated by backend (matching frontend MappingStatus)
  total?: number;
  incompatible?: number;
  warning?: number;
  solved?: number;
  compatible?: number;
  // Fields in the mapping
  fields?: MappingField[];
}
