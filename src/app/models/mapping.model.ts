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
  | 'delete'
  | 'empty'
  | 'copy_value_from'
  | 'copy_value_to'
  | 'fixed'
  | 'manual'
  | 'copy_node_to'
  | 'copy_node_from'
  | null;

/**
 * Interface representing an action option with metadata
 */
export interface ActionOption {
  // The action value (e.g., "use", "copy_value_from")
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
  // Type codes for the field (e.g., "string", "code", "Reference")
  types?: string[];
  // Referenced types for the field
  ref_types?: string[];
  // Note about inherited cardinality (e.g., "inherited from .parent")
  cardinality_note?: string;
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
  // List of recommended actions that have NOT been applied yet (do not influence status)
  // User must explicitly apply one to convert it to an active action
  recommendations?: ActionInfo[];
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

// ============================================================================
// Models for Recursive Field Resolution
// ============================================================================

/**
 * Profile-specific resolution information for a field.
 */
export interface ProfileResolutionInfo {
  /** Has resolvable references? */
  can_be_expanded: boolean;
  /** ID of the resolved profile */
  resolved_profile_id: string | null;
  /** Profile URLs from type[].profile[] */
  type_profiles: string[] | null;
  /** Target profiles from type[].targetProfile[] */
  ref_types: string[] | null;
}

/**
 * Profile-specific field information with resolution context.
 */
export interface ResolvedProfileFieldInfo {
  min: number;
  max: string;
  must_support: boolean;
  types: string[] | null;
  ref_types: string[] | null;
  type_profiles: string[] | null;
  cardinality_note: string | null;
  fixed_value: string | null;
  fixed_value_type: string | null;
  /** Whether this field can be expanded to show referenced profile fields */
  can_be_expanded: boolean;
  /** ID of the resolved profile if available */
  resolved_profile_id: string | null;
}

/**
 * Extended mapping field with resolution context.
 *
 * This model represents a field that may have been resolved from a
 * profile reference (fixedUri, fixedCanonical, type[].profile[], etc.)
 */
export interface ResolvedMappingField {
  /** Full path including resolved prefix */
  name: string;
  /** Original field name in the source profile */
  original_name: string;

  /** Profile information per profile key */
  source_profiles: { [profileKey: string]: ResolvedProfileFieldInfo | null };
  target_profile: ResolvedProfileFieldInfo | null;

  /** Classification and issues */
  classification: string;
  issues: string[] | null;

  /** Action information (same as MappingField) */
  action: MappingAction | null;
  other: string | null;
  fixed: string | null;
  actions_allowed: MappingAction[];
  action_info: ActionInfo | null;
  evaluation: EvaluationResult | null;
  recommendations: ActionInfo[];

  /** Resolution metadata */
  /** Path of the parent field if this was resolved from a reference */
  resolved_from: string | null;
  /** Depth of resolution (0 = direct field) */
  resolution_depth: number;
  /** URL of the referenced profile */
  referenced_profile_url: string | null;
  /** For frontend: Is this branch expanded? */
  is_expanded: boolean;

  /** Profile-specific resolution info */
  source_resolution_info: ProfileResolutionInfo | null;
  target_resolution_info: ProfileResolutionInfo | null;
}

/**
 * Information about a reference that could not be resolved.
 */
export interface UnresolvedReference {
  /** Path of the field with the unresolved reference */
  field_path: string;
  /** URL that could not be resolved */
  reference_url: string;
  /** Type of reference: 'fixedUri', 'fixedCanonical', 'type_profile', 'ref_type' */
  reference_type: 'fixedUri' | 'fixedCanonical' | 'type_profile' | 'ref_type';
  /** Which profile this reference is from: 'source' or 'target' */
  profile_context: 'source' | 'target';
}

/**
 * Statistics about the resolution process.
 */
export interface ResolutionStats {
  /** Total number of fields after resolution */
  total_fields: number;
  /** Number of references that were successfully resolved */
  resolved_references: number;
  /** Number of references that could not be resolved */
  unresolved_references: number;
  /** Maximum depth reached during resolution */
  max_depth_reached: number;
  /** List of profile IDs that were loaded */
  profiles_loaded: string[];
}

/**
 * Response containing recursively resolved mapping fields.
 */
export interface ResolvedMappingFieldsResponse {
  /** Mapping ID */
  id: string;
  /** All resolved fields */
  fields: ResolvedMappingField[];
  /** List of references that could not be resolved */
  unresolved_references: UnresolvedReference[];
  /** Statistics about the resolution process */
  resolution_stats: ResolutionStats;
}
