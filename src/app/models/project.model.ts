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

import { Mapping } from './mapping.model';
import { Comparison } from './comparison.model';
import { Package } from './package.model';

/**
 * Interface representing a complete project with all its components
 */
export interface Project {
  // Name of the project
  name: string;
  // Version of the project (optional)
  version?: string;
  // Status of the project (optional, e.g., "draft", "active", "retired")
  status?: string;
  // Mappings defined in this project
  mappings: Mapping[];
  // Comparisons defined in this project
  comparisons: Comparison[];
  // Packages used in this project
  packages: Package[];
}

/**
 * Interface for project overview in list views
 */
export interface ProjectOverview {
  // Name of the project
  name: string;
  // URL/key to access the project
  url: string;
  // Version of the project (optional)
  version?: string;
  // Status of the project (optional)
  status?: string;
}

/**
 * Interface for creating or updating a project
 */
export interface ProjectInput {
  // Name of the project
  name: string;
  // Version of the project (optional)
  version?: string;
  // Status of the project (optional)
  status?: string;
}

/**
 * Interface representing a list of projects
 */
export interface ProjectList {
  // Array of project overviews
  projects: ProjectOverview[];
}
