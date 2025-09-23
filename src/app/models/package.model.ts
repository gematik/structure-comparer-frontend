
/**
 * Interface representing a package structure
 * Used for FHIR package definitions and their metadata
 */
export interface Package {
  // Unique identifier for the package
  id: string;
  // Timestamp of when the package was last updated
  last_updated: string;
  // Display name shown in the UI
  display: string;
  // Technical name of the package
  name: string;
  // Version number of the package
  version: string;
}
