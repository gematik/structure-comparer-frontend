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
import { MappingAction } from './mapping.model';

/**
 * Interface representing a source profile in a transformation
 */
export interface TransformationSourceProfile {
  id?: string;
  url: string;
  key?: string;
  name: string;
  version: string;
  webUrl?: string;
  package?: string;
}

/**
 * Interface representing a target profile in a transformation
 */
export interface TransformationTargetProfile {
  id?: string;
  url: string;
  key?: string;
  name: string;
  version: string;
  webUrl?: string;
  package?: string;
}

/**
 * Interface representing a reference to a child mapping
 */
export interface MappingReference {
  id: string;
  name: string;
  url: string;
  version: string;
  status: string;
}

/**
 * Interface representing profile information for a transformation field
 */
export interface TransformationFieldProfile {
  min: number | string;
  max: number | string;
  must_support?: boolean;
  types?: string[];
  ref_types?: string[];
  cardinality_note?: string;
}

/**
 * Interface representing a transformation field
 */
export interface TransformationField {
  name: string;
  path?: string;
  action: MappingAction | null;
  actions_allowed: MappingAction[];
  classification?: string;
  profiles?: { [profileKey: string]: TransformationFieldProfile };
  other?: string;
  fixed?: string;
  remark?: string;
  map?: string;  // Reference to a child Mapping ID
  map_name?: string;  // Resolved name of the linked mapping
  target_creation?: string;  // Reference to a Target Creation ID
  target_creation_name?: string;  // Resolved name of the linked target creation
  source_min?: number | string;
  source_max?: number | string;
  target_min?: number | string;
  target_max?: number | string;
  action_info?: ActionInfo | null;
  evaluation?: EvaluationResult | null;
  recommendations?: ActionInfo[];
}

/**
 * Interface representing a transformation (bundle-level mapping)
 */
export interface Transformation {
  id: string;
  name: string;
  version: string;
  last_updated: string;
  status: string;
  sources: TransformationSourceProfile[];
  target: TransformationTargetProfile;
  url?: string;
  fields?: TransformationField[];
  linked_mappings?: MappingReference[];
  linked_mappings_count?: number;
  // Status counts
  total?: number;
  incompatible?: number;
  warning?: number;
  solved?: number;
  compatible?: number;
}

/**
 * Request payload for creating a transformation
 */
export interface TransformationCreateRequest {
  source_ids: string[];
  target_id: string;
}

/**
 * Request payload for creating a transformation with full details
 */
export interface TransformationCreate {
  name: string;
  version: string;
  status?: string;
  description?: string;
  sources: {
    url: string;
    name?: string;
    version?: string;
  }[];
  target: {
    url: string;
    name?: string;
    version?: string;
  };
}

/**
 * Request payload for updating a transformation
 */
export interface TransformationUpdateRequest {
  status?: string;
  version?: string;
  sources?: Partial<TransformationSourceProfile>[];
  target?: Partial<TransformationTargetProfile>;
}

/**
 * Request payload for updating a transformation field
 */
export interface TransformationFieldUpdateRequest {
  action: MappingAction;
  other?: string;
  fixed?: string;
  remark?: string;
  map?: string;
  target_creation?: string;
}

/**
 * Request payload for linking a mapping to a transformation field
 */
export interface TransformationMappingLinkRequest {
  mapping_id: string;
  action?: MappingAction;
  other?: string;  // Target profile field path
}
