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
 * Status of a package relative to config and filesystem
 */
export type PackageStatus = 'available' | 'missing' | 'orphaned';

/**
 * Interface representing a package structure
 * Used for FHIR package definitions and their metadata
 */
export interface Package {
  // Unique identifier for the package
  id: string;
  // Timestamp of when the package was last updated
  last_updated?: string;
  // Display name shown in the UI
  display?: string;
  // Technical name of the package
  name: string;
  // Version number of the package
  version: string;
  // Status of the package (available, missing, orphaned)
  status?: PackageStatus;
  // Optional description
  description?: string;
  // Optional canonical URL
  canonical?: string;
  // Optional source registry URL
  source_registry?: string;
}

/**
 * Response from the package list with status endpoint
 */
export interface PackageListWithStatus {
  packages: Package[];
  total: number;
  available: number;
  missing: number;
  orphaned: number;
}

/**
 * Request to add a package to config
 */
export interface PackageAddRequest {
  name: string;
  version: string;
  display?: string;
}

/**
 * Result of adding a package to config
 */
export interface PackageAddResult {
  success: boolean;
  package?: Package;
  message?: string;
}

/**
 * Result of cleaning up orphaned packages
 */
export interface OrphanedCleanupResult {
  success: boolean;
  deleted: string[];
  count: number;
}

/**
 * Result of adopting orphaned packages
 */
export interface OrphanedAdoptResult {
  success: boolean;
  adopted: string[];
  count: number;
}
