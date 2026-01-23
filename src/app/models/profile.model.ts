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
 * Interface representing a profile structure
 * Used for FHIR profile definitions and their metadata
 */
export interface Profile {
  // Unique identifier for the profile
  id: string;
  // Profile key used for referencing
  key: string;
  // Human-readable name of the profile
  name: string;
  // Package this profile belongs to
  package: string;
  // URL where the profile is hosted or defined
  url: string;
  // Version number of the profile
  version: string;
  // Optional web URL for documentation/Simplifier
  webUrl?: string;
}

/**
 * Interface for a profile field with cardinality and type information
 */
export interface ProfileField {
  min: number;
  max: string;
  must_support: boolean;
  types?: string[] | null;
  ref_types?: string[] | null;
  cardinality_note?: string | null;
  fixed_value?: any | null;
  fixed_value_type?: string | null;
}

/**
 * Extended profile field with resolved reference information.
 * Used when the backend has recursively resolved fixedUri/fixedCanonical references.
 */
export interface ResolvedProfileField extends ProfileField {
  // Full path including parent context (e.g., "Bundle.entry:Medication.resource.code")
  full_path: string;
  // The profile this field was loaded from
  source_profile_id: string;
  // Profile key (url|version)
  source_profile_key?: string | null;
  // URL if a fixedUri/fixedCanonical could not be resolved
  unresolved_reference?: string | null;
  // True if this field is a .resource field (entry point)
  is_resource_field: boolean;
}

/**
 * Response containing recursively resolved profile fields from the backend.
 */
export interface ResolvedProfileFieldsResponse {
  // Fields that are resource entry points
  resource_fields: ResolvedProfileField[];
  // Fields that are value types (primitives, etc.)
  value_fields: ResolvedProfileField[];
  // List of URLs that could not be resolved
  unresolved_references: string[];
}
