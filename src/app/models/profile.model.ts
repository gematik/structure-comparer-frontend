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