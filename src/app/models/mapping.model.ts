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
}