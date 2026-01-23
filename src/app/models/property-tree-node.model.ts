export interface PropertyTreeNode {
  id: string;                    // unique identifier, can be the full path or a generated id
  label: string;                 // path segment, e.g. "Medication", "code", "coding", "pzn", "system"
  fullPath: string;              // full FHIR path, only meaningful for leaves
  children?: PropertyTreeNode[]; // child nodes for non-leaf nodes
  isExpanded?: boolean;          // controls tree node expansion state

  // Original field data for leaf nodes only
  originalField?: any;           // reference to the original field object

  // Mapping-related metadata for leaf nodes
  compatibilityStatus?: string;
  mappingAction?: string;        // e.g. "ACTION_REQUIRED", "COPY", "IGNORE"
  mappingDescription?: string;   // e.g. "Aktion erforderlich", "Wird direkt übernommen"
  profileCardinalities?: Record<string, string>; // profileName -> "1 .. 1S" / "0 .. 1" / "—"
  recommendationText?: string;   // optional recommendation

  // Helper properties
  isLeaf?: boolean;              // true if this is a leaf node (has mapping data)
  depth?: number;                // depth in tree for styling purposes
}
