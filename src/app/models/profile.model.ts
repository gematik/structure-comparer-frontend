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
}