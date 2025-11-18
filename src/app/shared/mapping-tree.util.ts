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
        // Create new node
        const newNode: PropertyTreeNode = {
          id: currentPath,
          label: segment,
          fullPath: isLastSegment ? field.name : currentPath,
          isExpanded: false,
          depth: index,
          isLeaf: isLastSegment,
          children: isLastSegment ? undefined : []
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
      } else if (isLastSegment && !existingNode.isLeaf) {
        // Convert intermediate node to leaf node if needed
        existingNode.isLeaf = true;
        existingNode.originalField = field;
        existingNode.compatibilityStatus = field.classification;
        existingNode.mappingAction = field.action;
        existingNode.mappingDescription = getMappingDescription(field);
        existingNode.profileCardinalities = extractProfileCardinalities(field);
        existingNode.recommendationText = extractRecommendationText(field);
      }

      // Move to the next level
      if (!isLastSegment) {
        currentNodes = existingNode.children || [];
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
    case 'copy_from':
      return `Wird aus ${field.targetField} übernommen`;
    case 'copy_to':
      return `Wird in ${field.targetField} übernommen`;
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
