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
 * Models for manual entries import functionality
 * Used when importing and migrating legacy manual_entries.yaml files
 */

/**
 * Information about ID mapping during manual entries import
 * Contains statistics about how legacy mapping IDs were mapped to current mapping IDs
 */
export interface ManualEntriesIdMappingInfo {
  /** Number of legacy entries successfully mapped to current mapping IDs */
  mapped_entries: number;

  /** Number of legacy entries that could not be mapped to current mapping IDs */
  unmapped_entries: number;

  /** Number of warnings generated during the ID mapping process */
  warnings_count: number;

  /** Map of legacy mapping ID to current mapping ID */
  mappings: { [legacyId: string]: string };
}

/**
 * Response from the manual entries import endpoint
 * Contains status, statistics, and ID mapping information from the import process
 */
export interface ImportManualEntriesResponse {
  /** Status of the import operation (e.g., "ok" for success) */
  status: string;

  /** Human-readable message describing the import result */
  message: string;

  /** Key of the project where entries were imported */
  project_key: string;

  /** Total number of mapping entries imported */
  imported_entries: number;

  /** Total number of fields imported across all entries */
  imported_fields: number;

  /** Name of the uploaded file */
  filename: string;

  /** Optional information about legacy ID to current ID mapping */
  id_mapping?: ManualEntriesIdMappingInfo;
}
