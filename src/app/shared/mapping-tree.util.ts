import { PropertyTreeNode } from '../models/property-tree-node.model';

/**
 * Converts a flat list of FHIR properties into a hierarchical tree structure.
 *
 * @param fields Array of field objects from the mapping data
 * @returns Array of PropertyTreeNode representing the root nodes of the tree
 */
export function buildPropertyTree(fields: any[]): PropertyTreeNode[] {
  if (!fields || fields.length === 0) {
    return [];
  }

  const rootNodes: PropertyTreeNode[] = [];
  const nodeMap = new Map<string, PropertyTreeNode>();

  // Process each field to build the tree
  fields.forEach(field => {
    if (!field.name) return;

    const pathSegments = parsePropertyPath(field.name);
    let currentPath = '';
    let currentNodes = rootNodes;
    let parentNode: PropertyTreeNode | null = null;

    // Walk through each segment of the path
    pathSegments.forEach((segment, index) => {
      const isLastSegment = index === pathSegments.length - 1;
      currentPath = currentPath ? `${currentPath}.${segment}` : segment;

      // Check if node already exists at this level
      let existingNode = currentNodes.find(node => node.label === segment);

      if (!existingNode) {
        // Create new node - always initialize with children array
        // A node can be both a leaf (have field data) AND have children
        const newNode: PropertyTreeNode = {
          id: currentPath,
          label: segment,
          fullPath: isLastSegment ? field.name : currentPath,
          isExpanded: false,
          depth: index,
          isLeaf: isLastSegment,
          children: [] // Always initialize children array
        };

        // Add leaf node data
        if (isLastSegment) {
          newNode.originalField = field;
          newNode.compatibilityStatus = field.classification;
          newNode.mappingAction = field.action;
          newNode.mappingDescription = getMappingDescription(field);
          newNode.profileCardinalities = extractProfileCardinalities(field);
          newNode.recommendationText = extractRecommendationText(field);
        }

        currentNodes.push(newNode);
        nodeMap.set(currentPath, newNode);
        existingNode = newNode;
      } else if (isLastSegment) {
        // Node already exists - add field data to it
        // This allows a node to have both its own field data AND children
        existingNode.isLeaf = true;
        existingNode.originalField = field;
        existingNode.compatibilityStatus = field.classification;
        existingNode.mappingAction = field.action;
        existingNode.mappingDescription = getMappingDescription(field);
        existingNode.profileCardinalities = extractProfileCardinalities(field);
        existingNode.recommendationText = extractRecommendationText(field);

        // Ensure children array exists even for leaf nodes
        if (!existingNode.children) {
          existingNode.children = [];
        }
      }

      // Move to the next level
      if (!isLastSegment) {
        // Ensure children array exists
        if (!existingNode.children) {
          existingNode.children = [];
        }
        currentNodes = existingNode.children;
        parentNode = existingNode;
      }
    });
  });

  return rootNodes;
}

/**
 * Parses a FHIR property path into segments, handling dots, colons, and array selectors.
 *
 * Examples:
 * - "Medication.code.coding:pzn.system" -> ["Medication", "code", "coding:pzn", "system"]
 * - "Medication.ingredient.item[x]:itemCodeableConcept.coding:ask.code" ->
 *   ["Medication", "ingredient", "item[x]:itemCodeableConcept", "coding:ask", "code"]
 */
function parsePropertyPath(path: string): string[] {
  if (!path) return [];

  const segments: string[] = [];
  let currentSegment = '';
  let inBrackets = false;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (char === '[') {
      inBrackets = true;
      currentSegment += char;
    } else if (char === ']') {
      inBrackets = false;
      currentSegment += char;
    } else if (char === '.' && !inBrackets) {
      if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = '';
      }
    } else {
      currentSegment += char;
    }
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Extracts mapping description from field data
 */
function getMappingDescription(field: any): string | undefined {
  // This would depend on your existing logic for generating mapping descriptions
  // You might want to integrate this with your existing methods
  if (!field.action) return undefined;

  switch (field.action) {
    case 'use':
      return 'Wird direkt übernommen';
    case 'copy_value_from':
      return `Wird aus ${field.targetField} übernommen`;
    case 'copy_value_to':
      return `Wird in ${field.targetField} übernommen`;
    case 'copy_node_to':
      return `Knoten wird in ${field.targetField} kopiert`;
    case 'fixed':
      return `Wird fix auf ${field.fixedValue} gesetzt`;
    case 'manual':
      return 'Manuelle Anpassung erforderlich';
    default:
      return 'Aktion erforderlich';
  }
}

/**
 * Extracts profile cardinalities from field data
 */
function extractProfileCardinalities(field: any): Record<string, string> | undefined {
  if (!field.profiles) return undefined;

  const cardinalities: Record<string, string> = {};

  Object.keys(field.profiles).forEach(profileKey => {
    const profile = field.profiles[profileKey];
    if (profile) {
      const min = profile.min ?? 0;
      const max = profile.max ?? '*';
      const mustSupport = profile.must_support ? 'S' : '';
      cardinalities[profileKey] = `${min} .. ${max}${mustSupport}`;
    }
  });

  return Object.keys(cardinalities).length > 0 ? cardinalities : undefined;
}

/**
 * Extracts recommendation text from field data
 */
function extractRecommendationText(field: any): string | undefined {
  // This would integrate with your existing recommendation logic
  // For now, return undefined as this seems to come from mappingEvaluation
  return undefined;
}

/**
 * Flattens a tree back to a list (useful for filtering/searching)
 */
export function flattenTree(nodes: PropertyTreeNode[]): PropertyTreeNode[] {
  const result: PropertyTreeNode[] = [];

  function traverse(node: PropertyTreeNode) {
    result.push(node);
    if (node.children) {
      node.children.forEach(child => traverse(child));
    }
  }

  nodes.forEach(node => traverse(node));
  return result;
}

/**
 * Filters tree nodes based on a search term
 */
export function filterTreeNodes(nodes: PropertyTreeNode[], searchTerm: string): PropertyTreeNode[] {
  if (!searchTerm) return nodes;

  const filteredNodes: PropertyTreeNode[] = [];

  function matchesSearch(node: PropertyTreeNode): boolean {
    return node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
           node.fullPath.toLowerCase().includes(searchTerm.toLowerCase());
  }

  function hasMatchingDescendant(node: PropertyTreeNode): boolean {
    if (matchesSearch(node)) return true;
    if (!node.children) return false;
    return node.children.some(child => hasMatchingDescendant(child));
  }

  function filterNode(node: PropertyTreeNode): PropertyTreeNode | null {
    const matches = matchesSearch(node);
    const hasMatchingChildren = node.children && node.children.some(child => hasMatchingDescendant(child));

    if (!matches && !hasMatchingChildren) {
      return null;
    }

    const filteredChildren = node.children
      ? node.children.map(child => filterNode(child)).filter(child => child !== null) as PropertyTreeNode[]
      : undefined;

    return {
      ...node,
      children: filteredChildren,
      isExpanded: hasMatchingChildren || matches // Auto-expand if has matching children
    };
  }

  nodes.forEach(node => {
    const filtered = filterNode(node);
    if (filtered) {
      filteredNodes.push(filtered);
    }
  });

  return filteredNodes;
}

/**
 * Filters tree nodes with option to include parent nodes
 * @param nodes Tree nodes to filter
 * @param filterFn Function that determines if a leaf node matches the filter
 * @param includeParents Whether to include parent nodes even if they don't match
 * @returns Filtered tree with only direct ancestor parents included if specified
 */
export function filterTreeWithParents(
  nodes: PropertyTreeNode[],
  filterFn: (node: PropertyTreeNode) => boolean,
  includeParents: boolean = false
): PropertyTreeNode[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  /**
   * Recursively check if a node or any of its descendants match the filter
   */
  function hasMatchingDescendant(node: PropertyTreeNode): boolean {
    // Check if this node itself matches (if it's a leaf)
    if (node.isLeaf && filterFn(node)) {
      return true;
    }

    // Check if any children match
    if (!node.children || node.children.length === 0) {
      return false;
    }

    return node.children.some(child => hasMatchingDescendant(child));
  }

  /**
   * Recursively filter nodes, keeping only matching leaves and their direct ancestors
   */
  function filterNode(node: PropertyTreeNode): PropertyTreeNode | null {
    const nodeMatches = node.isLeaf && filterFn(node);
    const hasMatchingChildren = node.children && node.children.some(child => hasMatchingDescendant(child));

    // If includeParents is false, exclude nodes that don't match and have no matching children
    if (!includeParents && !nodeMatches && !hasMatchingChildren) {
      return null;
    }

    // If includeParents is true, include this node only if:
    // 1. It matches the filter itself, OR
    // 2. It has at least one matching descendant (making it a direct ancestor)
    if (includeParents && !nodeMatches && !hasMatchingChildren) {
      return null;
    }

    // Filter children recursively - only keep children that match or have matching descendants
    const filteredChildren = node.children
      ? node.children.map(child => filterNode(child)).filter(child => child !== null) as PropertyTreeNode[]
      : [];

    // Include this node if:
    // 1. It matches the filter (leaf node), OR
    // 2. includeParents is true AND it has matching descendants (is a direct ancestor)
    if (nodeMatches || (includeParents && filteredChildren.length > 0)) {
      return {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : (node.children || []),
        isExpanded: filteredChildren.length > 0 // Auto-expand if has matching children
      };
    }

    return null;
  }

  const filteredNodes: PropertyTreeNode[] = [];
  nodes.forEach(node => {
    const filtered = filterNode(node);
    if (filtered) {
      filteredNodes.push(filtered);
    }
  });

  return filteredNodes;
}
