
/**
 * Interface representing a comparison between profiles
 * Used for comparing source profiles against a target profile
 */
export interface Comparison {
  // Unique identifier for the comparison
  id: string;
  // Human-readable name of the comparison
  name: string;
  // Array of source profile identifiers being compared
  sources: string[];
  // Target profile identifier to compare against
  target: string;
}