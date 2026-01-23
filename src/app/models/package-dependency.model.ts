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
 * Models for package dependency analysis
 */

/**
 * A single package dependency
 */
export interface PackageDependency {
  /** Package name, e.g., "kbv.basis" */
  name: string;
  /** Package version, e.g., "1.7.0" */
  version: string;
  /** Combined key: name#version, e.g., "kbv.basis#1.7.0" */
  package_key: string;
}

/**
 * Dependency information for a single package
 */
export interface PackageDependencyInfo {
  /** Package key: name#version */
  package_key: string;
  /** Package name */
  package_name: string;
  /** Package version */
  package_version: string;
  /** Direct dependencies declared in package.json */
  direct_dependencies: PackageDependency[];
  /** All dependencies including transitive ones */
  all_dependencies: PackageDependency[];
}

/**
 * A missing package that is required by other packages
 */
export interface MissingDependency {
  /** The missing package key: name#version */
  package_key: string;
  /** List of package keys that require this package */
  required_by: string[];
  /** True if this is a direct dependency, false if transitive */
  is_direct_dependency: boolean;
}

/**
 * A version requirement for a package
 */
export interface VersionRequirement {
  /** Required version */
  version: string;
  /** Package that requires this version */
  required_by: string;
}

/**
 * Version conflict for a package where different versions are required
 */
export interface VersionMismatch {
  /** Package name (without version) */
  package_name: string;
  /** List of different version requirements */
  required_versions: VersionRequirement[];
  /** The version that is actually loaded, or null if not loaded */
  available_version: string | null;
}

/**
 * Complete result of the dependency analysis
 */
export interface DependencyAnalysisResult {
  /** All packages with their dependency information */
  packages: PackageDependencyInfo[];
  /** Packages that are required but not loaded */
  missing_dependencies: MissingDependency[];
  /** Packages with conflicting version requirements */
  version_mismatches: VersionMismatch[];
  /** Timestamp when the analysis was performed */
  analysis_timestamp: string;
}

/**
 * Request to download a package from a FHIR registry
 */
export interface PackageDownloadRequest {
  /** Package name, e.g., "kbv.basis" */
  package_name: string;
  /** Package version, e.g., "1.7.0" */
  version: string;
}

/**
 * Result of a single package download operation
 */
export interface PackageDownloadResult {
  /** Whether the download was successful */
  success: boolean;
  /** Package key: name#version */
  package_key: string;
  /** Status message */
  message: string;
  /** Which registry was used for download */
  registry_url?: string;
}

/**
 * Request to download multiple packages
 */
export interface BatchDownloadRequest {
  /** List of packages to download */
  packages: PackageDownloadRequest[];
}

/**
 * Result of a batch download operation
 */
export interface BatchDownloadResult {
  /** Total number of packages requested */
  total_requested: number;
  /** Number of successfully downloaded packages */
  successful: number;
  /** Number of failed downloads */
  failed: number;
  /** Individual results for each package */
  results: PackageDownloadResult[];
}
