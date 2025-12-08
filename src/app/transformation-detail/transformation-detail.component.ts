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
 */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TransformationService } from '../transformation.service';
import { ProjectService } from '../project.service';
import { Transformation, TransformationField, MappingReference, TransformationFieldUpdateRequest, TransformationMappingLinkRequest } from '../models/transformation.model';
import { Mapping } from '../models/mapping.model';
import { ResourceMappingTableComponent, ResourceMappingRow, SourceMappingEntry } from '../shared/resource-mapping-table/resource-mapping-table.component';
import { ValueMappingTableComponent, ValueMappingRow } from '../shared/value-mapping-table/value-mapping-table.component';
import { SourceFieldOption } from '../shared/base-mapping-table/base-mapping-table.component';

// Re-export for use in template
export { ResourceMappingRow, ValueMappingRow, SourceMappingEntry, SourceFieldOption };

@Component({
  selector: 'app-transformation-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule,
    MatChipsModule,
    MatTabsModule,
    ResourceMappingTableComponent,
    ValueMappingTableComponent
  ],
  templateUrl: './transformation-detail.component.html',
  styleUrls: ['./transformation-detail.component.css']
})
export class TransformationDetailComponent implements OnInit {
  projectKey: string = '';
  transformationId: string = '';
  transformation: Transformation | null = null;
  fields: TransformationField[] = [];
  linkedMappings: MappingReference[] = [];
  availableMappings: Mapping[] = [];
  loading = true;
  error: string | null = null;

  // Active tab index
  activeTabIndex = 0;

  // Resource mapping UI model (target-centric)
  resourceMappings: ResourceMappingRow[] = [];
  filteredResourceMappings: ResourceMappingRow[] = [];
  sourceResourceFields: SourceFieldOption[] = [];

  // Value mapping UI model (target-centric)
  valueMappings: ValueMappingRow[] = [];
  filteredValueMappings: ValueMappingRow[] = [];
  sourceValueFields: SourceFieldOption[] = [];

  // Quickfilter states (default enabled to show only Resource types / Value types)
  resourceFilterEnabled = true;
  valueFilterEnabled = true;

  // Text filter for searching source and target resources
  resourceTextFilter = '';
  valueTextFilter = '';

  // Track original state for change detection
  private originalResourceMappings: string = '';
  private originalValueMappings: string = '';

  // Cache for available profiles in the project
  private availableProfiles: Map<string, any> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private transformationService: TransformationService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.projectKey = this.route.snapshot.paramMap.get('projectKey') || '';
    this.transformationId = this.route.snapshot.paramMap.get('transformationId') || '';

    if (this.projectKey && this.transformationId) {
      this.loadTransformation();
      this.loadAvailableMappings();
    }
  }

  loadTransformation(): void {
    this.loading = true;
    this.transformationService.getTransformation(this.projectKey, this.transformationId)
      .pipe(catchError(err => {
        console.error('Error loading transformation', err);
        this.error = 'Fehler beim Laden der Transformation';
        this.loading = false;
        return of(null);
      }))
      .subscribe(result => {
        if (result) {
          this.transformation = result;
          this.fields = result.fields || [];
          this.linkedMappings = result.linked_mappings || [];

          // First load source profile fields, then build mappings
          this.loadSourceProfileFields().then(() => {
            this.buildMappings();
            this.loading = false;
          });
        } else {
          this.loading = false;
        }
      });
  }

  /**
   * Load fields from all source profiles
   */
  private async loadSourceProfileFields(): Promise<void> {
    if (!this.transformation?.sources?.length) return;

    this.sourceResourceFields = [];
    this.sourceValueFields = [];

    // First, load the list of all available profiles in the project
    await this.loadAvailableProfiles();

    // Sort sources to load Bundle profiles first
    const sortedSources = [...this.transformation.sources].sort((a, b) => {
      const aIsBundle = a.name?.toLowerCase().includes('bundle') || a.id?.toLowerCase().includes('bundle');
      const bIsBundle = b.name?.toLowerCase().includes('bundle') || b.id?.toLowerCase().includes('bundle');
      if (aIsBundle && !bIsBundle) return -1;
      if (!aIsBundle && bIsBundle) return 1;
      return 0;
    });

    for (const source of sortedSources) {
      const profileId = source.id;
      if (!profileId) continue;

      try {
        await this.loadProfileFieldsRecursive(profileId, source.key || profileId, '');
      } catch (error) {
        console.error('Error loading source profile:', profileId, error);
      }
    }

    // Remove duplicates
    this.sourceResourceFields = this.sourceResourceFields.filter((v, i, a) =>
      a.findIndex(t => t.name === v.name) === i
    );
    this.sourceValueFields = this.sourceValueFields.filter((v, i, a) =>
      a.findIndex(t => t.name === v.name) === i
    );

   }

  /**
   * Load all available profiles in the project to enable smart lookup of referenced profiles
   */
  private async loadAvailableProfiles(): Promise<void> {
    try {
      const response: any = await this.projectService.getProjectProfiles(this.projectKey).toPromise();
      if (response && response.profiles) {
        response.profiles.forEach((profile: any) => {
          // Store by ID for quick lookup
          this.availableProfiles.set(profile.id, profile);

          // Also store by resource type name for lookup by FHIR resource type
          // Extract resource type from profile name with various patterns:
          // - KBV_PR_ERP_Prescription -> Prescription, MedicationRequest
          // - GEM_ERP_PR_Medication -> Medication
          if (profile.name) {
            const patterns = [
              /_PR_[A-Z]+_(.+)$/, // KBV_PR_ERP_Prescription -> Prescription
              /_PR_(.+)$/         // GEM_ERP_PR_Medication -> Medication
            ];

            for (const pattern of patterns) {
              const match = profile.name.match(pattern);
              if (match) {
                const resourceType = match[1].replace(/_/g, ''); // Remove underscores

                // Special cases: Prescription profile is for MedicationRequest resource type
                if (resourceType === 'Prescription') {
                  this.availableProfiles.set('MedicationRequest', profile);
                }

                // Store by the extracted name
                if (!this.availableProfiles.has(resourceType)) {
                  this.availableProfiles.set(resourceType, profile);
                }
                break;
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error loading available profiles:', error);
    }
  }

  /**
   * Recursively load profile fields and referenced profiles
   */
  private async loadProfileFieldsRecursive(
    profileId: string,
    profileKey: string,
    pathPrefix: string,
    visited: Set<string> = new Set(),
    rootResourceType: string = ''
  ): Promise<void> {
    // Prevent infinite recursion
    if (visited.has(profileId)) {
      return;
    }
    visited.add(profileId);

    // Determine root resource type from profileId if not set
    if (!rootResourceType && profileId) {
      const match = profileId.match(/-(Bundle|Composition)/);
      if (match) {
        rootResourceType = match[1];
      }
    }

    try {
      const profile = await this.projectService.getProfileDetails(this.projectKey, profileId).toPromise();
      if (!profile || !profile.fields) return;

      // Process each field from the source profile
      const fieldEntries = Object.entries(profile.fields);

      for (const [fieldPath, fieldInfo] of fieldEntries) {
        const types = (fieldInfo as any).types || [];
        const cardinalityMin = (fieldInfo as any).min ?? null;
        const cardinalityMax = (fieldInfo as any).max ?? null;

        // Build full path with prefix
        let fullPath = pathPrefix ? pathPrefix + fieldPath : fieldPath;

        // Remove leading dot if present
        if (fullPath.startsWith('.')) {
          fullPath = fullPath.substring(1);
        }

        // Prepend root resource type if not already present
        if (rootResourceType && !fullPath.startsWith(rootResourceType + '.')) {
          fullPath = rootResourceType + '.' + fullPath;
        }

        // Check if it's a resource field (ends with .resource exactly)
        const isResourceField = fieldPath.toLowerCase().endsWith('.resource');

        // Create display name
        let displayName = fullPath;

        // For entry resources, keep the full path (e.g., Bundle.entry:VerordnungArzneimittel.resource)
        if (isResourceField) {
          this.sourceResourceFields.push({
            name: displayName,
            displayName: displayName,
            profileKey: profileKey,
            cardinalityMin: cardinalityMin,
            cardinalityMax: cardinalityMax
          });

          // Load referenced profile fields
          if (types.length > 0) {
            const resourceType = types[0]; // e.g., "MedicationRequest"

            // Look up the profile for this resource type from available profiles
            let referencedProfile = this.availableProfiles.get(resourceType);

            if (referencedProfile) {
              // Recursively load the referenced profile with the current path as prefix
              await this.loadProfileFieldsRecursive(
                referencedProfile.id,
                profileKey,
                displayName, // Use the resource field path as prefix (dot will be added via fieldPath which starts with .)
                visited,
                rootResourceType // Pass along the root resource type
              );
            }
          }
        }

        // Add ALL fields to sourceValueFields (including children of .resource fields)
        const parts = fullPath.split('.');
        let simpleDisplayName = parts[parts.length - 1].replace(/:\w+$/, '');

        this.sourceValueFields.push({
          name: displayName,
          displayName: simpleDisplayName,
          profileKey: profileKey,
          cardinalityMin: cardinalityMin,
          cardinalityMax: cardinalityMax
        });
      }
    } catch (error) {
      // Silently fail for referenced profiles that don't exist
    }
  }

  /**
   * Get all source fields (both resource and value fields) for the value mapping dropdown
   * This allows users to select both .resource fields and regular value fields
   */
  get allSourceFields(): SourceFieldOption[] {
    return [...this.sourceResourceFields, ...this.sourceValueFields];
  }

  /**
   * Build both resource and value mappings from transformation fields
   * Source fields are already loaded via loadSourceProfileFields()
   */
  private buildMappings(): void {
    this.buildResourceMappings();
    this.buildValueMappings();
    // Note: Source fields are now loaded asynchronously in loadSourceProfileFields()
  }

  /**
   * Build the resource mappings from transformation fields
   *
   * IMPORTANT: Backend stores fields SOURCE-CENTRIC:
   * - Source fields (Bundle.*) have 'other' pointing to target (Parameters.*)
   * - We need to display TARGET-CENTRIC for the user
   *
   * So we:
   * 1. Find all source resource fields (Bundle.entry:*.resource) with action='use'
   * 2. Group them by their 'other' target field
   * 3. Display target fields, with source as dropdown selection
   */
  private buildResourceMappings(): void {
    console.log('Building resource mappings...');
    console.log('All fields:', this.fields.length);

    // Get the target profile name to identify target fields
    const targetName = this.transformation?.target?.name || '';
    const targetResourceType = targetName.includes('Parameters') ? 'Parameters' : targetName.split('_')[0];

    // Get source profile names to identify source fields
    const sourceNames = this.transformation?.sources?.map(s => s.name || '') || [];
    const sourceResourceTypes = sourceNames.map(name =>
      name.includes('Bundle') ? 'Bundle' : name.split('_')[0]
    );

    console.log('Target resource type:', targetResourceType);
    console.log('Source resource types:', sourceResourceTypes);

    // Find all SOURCE resource fields (these have the actual mappings)
    const sourceResourceFields = this.fields.filter(f => {
      const isSourceField = sourceResourceTypes.some(type => f.name.startsWith(type + '.'));
      const isResourceField = f.name.toLowerCase().endsWith('.resource');
      return isSourceField && isResourceField;
    });

    console.log('Source resource fields with mappings:', sourceResourceFields.length);
    sourceResourceFields.forEach(f => console.log('  Source:', f.name, 'other:', f.other, 'map:', f.map));

    // Add source fields to dropdown options
    sourceResourceFields.forEach(field => {
      const parts = field.name.split('.');
      const entryPart = parts.find(p => p.startsWith('entry:'));
      let displayName = field.name;
      if (entryPart) {
        displayName = entryPart.replace('entry:', '') + '.resource';
      }

      const exists = this.sourceResourceFields.some(s => s.name === field.name);
      if (!exists) {
        this.sourceResourceFields.push({
          name: field.name,
          displayName: displayName,
          profileKey: 'transformation'
        });
      }
    });

    // Find ALL TARGET fields for display (filter will narrow down)
    // Include fields ending with .resource or .value[x]
    // Exclude fields whose parent has a .name sibling (e.g., Parameters.parameter.resource)
    const allTargetFields = this.fields.filter(f => {
      const isTargetField = f.name.startsWith(targetResourceType + '.');
      if (!isTargetField) return false;

      // Only include .resource or .value[x] fields
      const isResourceOrValueField = f.name.toLowerCase().endsWith('.resource') ||
                                      f.name.toLowerCase().endsWith('.value[x]');
      if (!isResourceOrValueField) return false;

      // Get parent path (everything except the last part)
      const parts = f.name.split('.');
      if (parts.length < 2) return true; // Safety check
      const parentPath = parts.slice(0, -1).join('.');

      // Check if parent has a .name sibling
      const hasNameSibling = this.fields.some(field =>
        field.name === parentPath + '.name'
      );

      // Exclude if parent has .name sibling AND this is a generic (non-sliced) field
      // We identify generic fields by checking if they don't contain ':' (slice notation)
      const isGenericField = !f.name.includes(':');

      if (hasNameSibling && isGenericField) {
        return false;
      }

      return true;
    });

    console.log('All target fields:', allTargetFields.length);
    const targetResourceFieldsCount = allTargetFields.filter(f => f.name.toLowerCase().endsWith('.resource')).length;
    console.log('Target resource fields:', targetResourceFieldsCount);

    // Build a map: target field -> ALL source fields that map to it (multiple sources per target!)
    const targetToSourceMap = new Map<string, SourceMappingEntry[]>();

    sourceResourceFields.forEach(srcField => {
      // Accept both 'use' and 'use_recursive' actions for resource mappings
      if (srcField.other && (srcField.action === 'use' || srcField.action === 'use_recursive')) {
        // Convert relative 'other' path to absolute target field name
        let targetPath = srcField.other;
        if (targetPath.startsWith('.')) {
          targetPath = targetResourceType + targetPath;
        }

        if (!targetToSourceMap.has(targetPath)) {
          targetToSourceMap.set(targetPath, []);
        }

        // Extract display name from source field
        const sourceParts = srcField.name.split('.');
        const entryPart = sourceParts.find(p => p.startsWith('entry:'));
        const sourceName = entryPart ? entryPart.replace('entry:', '') : srcField.name;

        targetToSourceMap.get(targetPath)!.push({
          sourceField: srcField.name,
          sourceName: sourceName,
          mappingId: srcField.map || null,
          mappingName: srcField.map_name || null
        });
      }
    });

    console.log('Target to source mapping:', Array.from(targetToSourceMap.entries()));

    // Build target rows for ALL fields (filter will narrow down to resource types if enabled)
    this.resourceMappings = allTargetFields.map(field => {
      const parts = field.name.split('.');
      const paramPart = parts.find(p => p.startsWith('parameter:'));
      const partPart = parts.find(p => p.startsWith('part:'));
      const isResourceField = field.name.toLowerCase().endsWith('.resource');
      const isValueXField = field.name.toLowerCase().endsWith('.value[x]');

      let targetDisplayName = field.name;
      if (paramPart) {
        targetDisplayName = paramPart.replace('parameter:', '');
        if (partPart) {
          targetDisplayName += '.' + partPart.replace('part:', '');
        }
        // Add the last part of the field name
        const lastPart = parts[parts.length - 1];
        if (!targetDisplayName.endsWith(lastPart)) {
          targetDisplayName += '.' + lastPart.replace(/:\w+$/, '');
        }
      }

      // Get ALL existing source mappings for this target
      const existingSourceMappings = targetToSourceMap.get(field.name) || [];

      // If no existing mappings, create one empty entry for the user to fill
      const sourceMappings: SourceMappingEntry[] = existingSourceMappings.length > 0
        ? existingSourceMappings.map(m => ({ ...m }))
        : [{ sourceField: null, sourceName: null, mappingId: null, mappingName: null }];

      // Extract cardinality from field (use source_min/max as these represent the target field's cardinality)
      const targetCardinalityMin = field.source_min ?? null;
      const targetCardinalityMax = field.source_max ?? null;

      return {
        targetField: field.name,
        targetName: targetDisplayName,
        sourceMappings: sourceMappings,
        originalSourceMappings: JSON.parse(JSON.stringify(sourceMappings)),
        isResourceField: isResourceField,
        isValueXField: isValueXField,
        targetCardinalityMin: targetCardinalityMin,
        targetCardinalityMax: targetCardinalityMax
      };
    });

    this.applyResourceFilter();

    // Store original state
    this.originalResourceMappings = JSON.stringify(this.resourceMappings.map(r => ({
      sourceMappings: r.sourceMappings
    })));

    console.log('Resource mappings built:', this.resourceMappings.length);
    this.resourceMappings.forEach(r => {
      console.log('  Row:', r.targetName, 'sources:', r.sourceMappings.length);
      r.sourceMappings.forEach(s => console.log('    -', s.sourceName, 'mapping:', s.mappingName));
    });
  }

  /**
   * Build the value mappings from TARGET fields that have value types (not Resource)
   */
  private buildValueMappings(): void {
    // Use the same target resource type detection as buildResourceMappings
    const targetName = this.transformation?.target?.name || '';
    const targetResourceType = targetName.includes('Parameters') ? 'Parameters' : targetName.split('_')[0];

    if (!targetResourceType) return;

    // Filter target fields (exclude Resource type fields)
    // Use name-based filtering like buildResourceMappings for consistency
    // Also exclude fields whose parent has a .name sibling (same logic as resources)
    const targetValueFields = this.fields.filter(f => {
      // Must be a target field (starts with target resource type)
      const isTargetField = f.name.startsWith(targetResourceType + '.');
      if (!isTargetField) return false;

      // Exclude Resource type fields (.resource suffix)
      const isResourceField = f.name.toLowerCase().endsWith('.resource');
      if (isResourceField) return false;

      // Get parent path (everything except the last part)
      const parts = f.name.split('.');
      if (parts.length < 2) return true; // Safety check
      const parentPath = parts.slice(0, -1).join('.');

      // Check if parent has a .name sibling
      const hasNameSibling = this.fields.some(field =>
        field.name === parentPath + '.name'
      );

      // Exclude if parent has .name sibling AND this is a generic (non-sliced) field
      // We identify generic fields by checking if they don't contain ':' (slice notation)
      const isGenericField = !f.name.includes(':');

      if (hasNameSibling && isGenericField) {
        return false;
      }

      return true;
    });

    // Build value mapping rows
    this.valueMappings = targetValueFields.map(field => {
      const parts = field.name.split('.');
      const depth = parts.length - 1;

      // Check if this is a value[x] type field
      const isValueXField = field.name.endsWith('.value[x]');

      // Create display name
      let targetName = parts[parts.length - 1];
      // Clean up slice notation
      targetName = targetName.replace(/:\w+$/, '');

      // Check if has children (other fields that start with this field's name)
      const hasChildren = this.fields.some(f =>
        f.name !== field.name && f.name.startsWith(field.name + '.')
      );

      // Get existing copy_from source
      const copyFromSource = field.other || null;

      // Extract cardinality from field (use source_min/max as these represent the target field's cardinality)
      const cardinalityMin = field.source_min ?? null;
      const cardinalityMax = field.source_max ?? null;

      return {
        targetField: field.name,
        targetName: targetName,
        targetPath: field.name,
        action: field.action || null,
        copyFromSource: copyFromSource,
        originalAction: field.action || null,
        originalCopyFromSource: copyFromSource,
        hasChildren: hasChildren,
        depth: depth,
        isValueXField: isValueXField,
        cardinalityMin: cardinalityMin,
        cardinalityMax: cardinalityMax
      };
    });

    this.applyValueFilter();

    // Store original state
    this.originalValueMappings = JSON.stringify(this.valueMappings.map(v => ({
      action: v.action,
      copyFromSource: v.copyFromSource
    })));
  }

  /**
   * Apply resource type filter
   * When enabled: Only show rows that are Resource type fields (.resource) or Value[x] fields (.value[x])
   * When disabled: Show all target fields
   * Also applies text filter for source and target resources
   */
  applyResourceFilter(): void {
    let filtered = this.resourceMappings;

    // Apply type filter
    if (this.resourceFilterEnabled) {
      // Filter to only show Resource type fields or Value[x] fields
      filtered = filtered.filter(row => row.isResourceField || row.isValueXField);
    }

    // Apply text filter
    if (this.resourceTextFilter.trim()) {
      const searchTerm = this.resourceTextFilter.toLowerCase().trim();
      filtered = filtered.filter(row => {
        // Check target field name
        const targetMatches = row.targetField.toLowerCase().includes(searchTerm) ||
                              row.targetName.toLowerCase().includes(searchTerm);

        // Check source field names
        const sourceMatches = row.sourceMappings.some(s =>
          (s.sourceField?.toLowerCase().includes(searchTerm)) ||
          (s.sourceName?.toLowerCase().includes(searchTerm))
        );

        return targetMatches || sourceMatches;
      });
    }

    this.filteredResourceMappings = filtered;
  }

  /**
   * Apply value type filter
   * When enabled: Only show rows that are value[x] type fields
   * When disabled: Show all target fields
   * Also applies text filter
   */
  applyValueFilter(): void {
    let filtered = this.valueMappings;

    // Apply type filter
    if (this.valueFilterEnabled) {
      // Filter to show only value[x] type fields
      filtered = filtered.filter(v => v.isValueXField);
    }

    // Apply text filter
    if (this.valueTextFilter.trim()) {
      const searchTerm = this.valueTextFilter.toLowerCase().trim();
      filtered = filtered.filter(v => {
        return v.targetField.toLowerCase().includes(searchTerm) ||
               v.targetName.toLowerCase().includes(searchTerm) ||
               v.targetPath.toLowerCase().includes(searchTerm) ||
               (v.copyFromSource?.toLowerCase().includes(searchTerm));
      });
    }

    this.filteredValueMappings = filtered;
  }

  /**
   * Called when resource text filter changes
   */
  onResourceTextFilterChange(text: string): void {
    this.resourceTextFilter = text;
    this.applyResourceFilter();
  }

  /**
   * Called when value text filter changes
   */
  onValueTextFilterChange(text: string): void {
    this.valueTextFilter = text;
    this.applyValueFilter();
  }

  /**
   * Clear resource text filter
   */
  clearResourceTextFilter(): void {
    this.resourceTextFilter = '';
    this.applyResourceFilter();
  }

  /**
   * Clear value text filter
   */
  clearValueTextFilter(): void {
    this.valueTextFilter = '';
    this.applyValueFilter();
  }

  /**
   * Toggle resource filter
   */
  onResourceFilterToggle(): void {
    this.applyResourceFilter();
  }

  /**
   * Called when resource filter toggle changes (from FilterBarComponent)
   */
  onResourceFilterToggleChange(enabled: boolean): void {
    this.resourceFilterEnabled = enabled;
    this.applyResourceFilter();
  }

  /**
   * Toggle value filter
   */
  onValueFilterToggle(): void {
    this.applyValueFilter();
  }

  /**
   * Called when value filter toggle changes (from FilterBarComponent)
   */
  onValueFilterToggleChange(enabled: boolean): void {
    this.valueFilterEnabled = enabled;
    this.applyValueFilter();
  }

  loadAvailableMappings(): void {
    const projectData = this.projectService.getProjectData();
    if (projectData && projectData.mappings) {
      this.availableMappings = projectData.mappings;
    } else {
      this.projectService.reloadProjectData(this.projectKey)
        .pipe(catchError(err => {
          console.error('Error loading project', err);
          return of(null);
        }))
        .subscribe((project: any) => {
          if (project && project.mappings) {
            this.availableMappings = project.mappings;
          }
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/project', this.projectKey]);
  }

  viewMapping(mappingId: string): void {
    this.router.navigate(['/project', this.projectKey, 'mapping', mappingId]);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'draft': return 'status-draft';
      case 'published': return 'status-published';
      case 'deprecated': return 'status-deprecated';
      default: return '';
    }
  }

  getMappingName(mappingId: string): string {
    const mapping = this.availableMappings.find(m => m.id === mappingId);
    return mapping?.name || mappingId;
  }

  // =====================
  // Resource Tab Methods
  // =====================

  /**
   * Called when resource mappings change from the child component
   */
  onResourceMappingsChange(rows: ResourceMappingRow[]): void {
    this.resourceMappings = rows;
  }

  /**
   * Check if there are unsaved resource changes
   */
  hasResourceChanges(): boolean {
    const currentState = JSON.stringify(this.resourceMappings.map(r => ({
      sourceMappings: r.sourceMappings
    })));
    return currentState !== this.originalResourceMappings;
  }

  /**
   * Save resource mapping changes
   *
   * IMPORTANT: The backend stores transformation fields SOURCE-CENTRIC:
   * - name: Source field (e.g., Bundle.entry:RezeptierdatenPZNVerordnung.resource)
   * - other: Target field (e.g., .parameter:rxPrescription.part:medication.resource)
   * - map: Mapping ID
   *
   * For creating/updating: Use POST /link-mapping with action: 'use'
   * For deleting: Use DELETE /link-mapping to completely remove the entry
   */
  saveResourceChanges(): void {
    // Collect all current source mappings
    const currentSourceMappings: { targetField: string; sourceEntry: SourceMappingEntry }[] = [];

    this.resourceMappings.forEach(row => {
      row.sourceMappings.forEach(sourceEntry => {
        if (sourceEntry.sourceField) {
          currentSourceMappings.push({
            targetField: row.targetField,
            sourceEntry: sourceEntry
          });
        }
      });
    });

    // Collect all original source mappings to detect deletions
    const originalSourceFields = new Set<string>();
    this.resourceMappings.forEach(row => {
      row.originalSourceMappings.forEach(origEntry => {
        if (origEntry.sourceField) {
          originalSourceFields.add(origEntry.sourceField);
        }
      });
    });

    // Find deleted source mappings (in original but not in current)
    const currentSourceFields = new Set(currentSourceMappings.map(m => m.sourceEntry.sourceField));
    const deletedSourceFields = [...originalSourceFields].filter(sf => !currentSourceFields.has(sf));

    // Build list of all operations
    type OperationType = 'link' | 'unlink';
    interface SaveOperation {
      type: OperationType;
      sourceField: string;
      otherPath?: string;
      mappingId?: string;
    }

    const operations: SaveOperation[] = [];

    // Add link operations for current mappings
    currentSourceMappings.forEach(({ targetField, sourceEntry }) => {
      let otherPath = targetField;
      if (otherPath.startsWith('Parameters')) {
        otherPath = otherPath.replace(/^Parameters/, '');
      }
      operations.push({
        type: 'link',
        sourceField: sourceEntry.sourceField!,
        otherPath: otherPath,
        mappingId: sourceEntry.mappingId || undefined
      });
    });

    // Add unlink operations for removed mappings
    deletedSourceFields.forEach(sourceField => {
      operations.push({
        type: 'unlink',
        sourceField: sourceField
      });
    });

    if (operations.length === 0) {
      this.snackBar.open('Keine Änderungen zum Speichern', 'OK', { duration: 2000 });
      return;
    }

    let savedCount = 0;
    let errorCount = 0;

    operations.forEach(op => {
      console.log('Executing operation:', op);

      if (op.type === 'link') {
        // Use POST /link-mapping to create/update with action: 'use'
        const linkRequest: TransformationMappingLinkRequest = {
          mapping_id: op.mappingId || '',
          action: 'use',
          other: op.otherPath
        };

        this.transformationService.linkMapping(
          this.projectKey,
          this.transformationId,
          op.sourceField,
          linkRequest
        ).subscribe({
          next: () => {
            savedCount++;
            if (savedCount + errorCount === operations.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          },
          error: (err: unknown) => {
            console.error('Error linking mapping', err);
            errorCount++;
            if (savedCount + errorCount === operations.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          }
        });
      } else {
        // Use DELETE /link-mapping to completely remove the entry
        this.transformationService.unlinkMapping(
          this.projectKey,
          this.transformationId,
          op.sourceField
        ).subscribe({
          next: () => {
            savedCount++;
            if (savedCount + errorCount === operations.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          },
          error: (err: unknown) => {
            console.error('Error unlinking mapping', err);
            errorCount++;
            if (savedCount + errorCount === operations.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          }
        });
      }
    });
  }

  // =====================
  // Value Tab Methods
  // =====================

  /**
   * Called when value mappings change from the child component
   */
  onValueMappingsChange(rows: ValueMappingRow[]): void {
    this.valueMappings = rows;
  }

  /**
   * Check if there are unsaved value changes
   */
  hasValueChanges(): boolean {
    const currentState = JSON.stringify(this.valueMappings.map(v => ({
      action: v.action,
      copyFromSource: v.copyFromSource
    })));
    return currentState !== this.originalValueMappings;
  }

  /**
   * Save value mapping changes
   */
  saveValueChanges(): void {
    const changedRows = this.valueMappings.filter(v =>
      v.action !== v.originalAction || v.copyFromSource !== v.originalCopyFromSource
    );

    if (changedRows.length === 0) {
      this.snackBar.open('Keine Änderungen zum Speichern', 'OK', { duration: 2000 });
      return;
    }

    let savedCount = 0;
    let errorCount = 0;

    changedRows.forEach(row => {
      const updateRequest: TransformationFieldUpdateRequest = {
        action: row.action || 'copy_from',
        other: row.copyFromSource || undefined
      };

      this.transformationService.updateTransformationField(
        this.projectKey,
        this.transformationId,
        row.targetField,
        updateRequest
      ).subscribe({
        next: () => {
          savedCount++;
          if (savedCount + errorCount === changedRows.length) {
            this.onSaveComplete(savedCount, errorCount);
          }
        },
        error: (err: unknown) => {
          console.error('Error saving value mapping', err);
          errorCount++;
          if (savedCount + errorCount === changedRows.length) {
            this.onSaveComplete(savedCount, errorCount);
          }
        }
      });
    });
  }

  /**
   * Check if there are any unsaved changes (either tab)
   */
  hasChanges(): boolean {
    return this.hasResourceChanges() || this.hasValueChanges();
  }

  private onSaveComplete(savedCount: number, errorCount: number): void {
    if (errorCount > 0) {
      this.snackBar.open(
        `${savedCount} gespeichert, ${errorCount} Fehler`,
        'OK',
        { duration: 5000 }
      );
    } else {
      this.snackBar.open(
        `${savedCount} Änderungen gespeichert`,
        'OK',
        { duration: 3000 }
      );
    }
    // Reload to get fresh state
    this.loadTransformation();
  }

}
