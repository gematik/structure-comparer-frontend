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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TransformationService } from '../transformation.service';
import { ProjectService } from '../project.service';
import { Transformation, TransformationField, MappingReference, TransformationFieldUpdateRequest, TransformationMappingLinkRequest } from '../models/transformation.model';
import { Mapping, MappingAction } from '../models/mapping.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/**
 * A single source mapping entry (source resource + mapping)
 */
interface SourceMappingEntry {
  sourceField: string | null;
  sourceName: string | null;
  mappingId: string | null;
  mappingName: string | null;
}

/**
 * UI model for a resource mapping row (target-centric)
 * The target resource is fixed, user can add multiple source resources with mappings
 */
interface ResourceMappingRow {
  targetField: string;
  targetName: string;
  sourceMappings: SourceMappingEntry[];
  originalSourceMappings: SourceMappingEntry[];
}

/**
 * UI model for a value mapping row (target-centric)
 * The target value is fixed, user defines copy_from sources
 */
interface ValueMappingRow {
  targetField: string;
  targetName: string;
  targetPath: string;
  action: MappingAction | null;
  copyFromSource: string | null;  // The source field path for copy_from
  originalAction: MappingAction | null;
  originalCopyFromSource: string | null;
  hasChildren: boolean;
  depth: number;
}

/**
 * Source field option for dropdowns
 */
interface SourceFieldOption {
  name: string;
  displayName: string;
  profileKey: string;
}

@Component({
  selector: 'app-transformation-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatTableModule,
    MatCardModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatInputModule
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

  // Quickfilter states (default enabled)
  resourceFilterEnabled = true;
  valueFilterEnabled = true;

  // Track original state for change detection
  private originalResourceMappings: string = '';
  private originalValueMappings: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private transformationService: TransformationService,
    private projectService: ProjectService,
    private dialog: MatDialog,
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

    for (const source of this.transformation.sources) {
      const profileId = source.id;
      if (!profileId) continue;

      try {
        const profile = await this.projectService.getProfileDetails(this.projectKey, profileId).toPromise();
        if (profile && profile.fields) {
          // Process each field from the source profile
          Object.keys(profile.fields).forEach(fieldPath => {
            const fieldInfo = profile.fields[fieldPath];
            const types = fieldInfo.types || [];

            // Check if it's a resource field
            const isResource = types.some((t: string) => t === 'Resource' || t.endsWith('Resource')) ||
                              fieldPath.toLowerCase().endsWith('.resource');

            // Create display name
            let displayName = fieldPath;
            if (fieldPath.startsWith('.')) {
              displayName = fieldPath.substring(1); // Remove leading dot
            }

            // For entry resources, extract friendly name
            if (isResource) {
              const match = fieldPath.match(/\.entry:([^.]+)\.resource/);
              if (match) {
                displayName = match[1] + '.resource';
              }

              this.sourceResourceFields.push({
                name: fieldPath.startsWith('.') ? fieldPath.substring(1) : fieldPath,
                displayName: displayName,
                profileKey: source.key || profileId
              });
            } else {
              // For value fields
              const parts = fieldPath.split('.');
              displayName = parts[parts.length - 1].replace(/:\w+$/, '');

              this.sourceValueFields.push({
                name: fieldPath.startsWith('.') ? fieldPath.substring(1) : fieldPath,
                displayName: displayName,
                profileKey: source.key || profileId
              });
            }
          });
        }
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

    console.log('Source resource fields loaded:', this.sourceResourceFields.length);
    console.log('Source resource fields:', this.sourceResourceFields);
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

    // Find TARGET resource fields (Parameters.*.resource) for display
    const targetResourceFields = this.fields.filter(f => {
      const isTargetField = f.name.startsWith(targetResourceType + '.');
      const isResourceField = f.name.toLowerCase().endsWith('.resource');
      return isTargetField && isResourceField;
    });

    console.log('Target resource fields:', targetResourceFields.length);
    targetResourceFields.forEach(f => console.log('  Target:', f.name));

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

    // Build target resource rows with multiple sources per target
    this.resourceMappings = targetResourceFields.map(field => {
      const parts = field.name.split('.');
      const paramPart = parts.find(p => p.startsWith('parameter:'));
      const partPart = parts.find(p => p.startsWith('part:'));
      let targetDisplayName = field.name;
      if (paramPart) {
        targetDisplayName = paramPart.replace('parameter:', '');
        if (partPart) {
          targetDisplayName += '.' + partPart.replace('part:', '');
        }
        targetDisplayName += '.resource';
      }

      // Get ALL existing source mappings for this target
      const existingSourceMappings = targetToSourceMap.get(field.name) || [];

      // If no existing mappings, create one empty entry for the user to fill
      const sourceMappings: SourceMappingEntry[] = existingSourceMappings.length > 0
        ? existingSourceMappings.map(m => ({ ...m }))
        : [{ sourceField: null, sourceName: null, mappingId: null, mappingName: null }];

      return {
        targetField: field.name,
        targetName: targetDisplayName,
        sourceMappings: sourceMappings,
        originalSourceMappings: JSON.parse(JSON.stringify(sourceMappings))
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
    const targetKey = this.transformation?.target?.key || this.transformation?.target?.id;
    if (!targetKey) return;

    // Filter target fields that have value types (exclude Resource type)
    const targetValueFields = this.fields.filter(f => {
      const profile = f.profiles?.[targetKey];
      if (!profile) return false;
      const types = profile.types || [];
      // Exclude Resource types, include value types
      const isResource = types.some(t => t === 'Resource' || t.endsWith('Resource'));
      const hasValueType = types.some(t =>
        ['string', 'code', 'boolean', 'integer', 'decimal', 'dateTime', 'date', 'time', 'uri', 'url', 'canonical', 'id', 'oid', 'uuid', 'Identifier', 'CodeableConcept', 'Coding', 'Quantity', 'Reference', 'Period', 'Ratio', 'HumanName', 'Address', 'ContactPoint', 'Attachment', 'Annotation', 'Signature'].includes(t)
      );
      return !isResource && (hasValueType || types.length === 0);
    });

    // Build value mapping rows
    this.valueMappings = targetValueFields.map(field => {
      const parts = field.name.split('.');
      const depth = parts.length - 1;

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

      return {
        targetField: field.name,
        targetName: targetName,
        targetPath: field.name,
        action: field.action || null,
        copyFromSource: copyFromSource,
        originalAction: field.action || null,
        originalCopyFromSource: copyFromSource,
        hasChildren: hasChildren,
        depth: depth
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
   */
  applyResourceFilter(): void {
    if (this.resourceFilterEnabled) {
      // Filter to only show rows with Resource type assignments
      this.filteredResourceMappings = this.resourceMappings;
    } else {
      this.filteredResourceMappings = this.resourceMappings;
    }
  }

  /**
   * Apply value type filter
   */
  applyValueFilter(): void {
    if (this.valueFilterEnabled) {
      // Filter to show value type fields only
      this.filteredValueMappings = this.valueMappings;
    } else {
      this.filteredValueMappings = this.valueMappings;
    }
  }

  /**
   * Toggle resource filter
   */
  onResourceFilterToggle(): void {
    this.applyResourceFilter();
  }

  /**
   * Toggle value filter
   */
  onValueFilterToggle(): void {
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
   * Called when a source resource is selected for a target row's source entry
   */
  onSourceResourceChanged(rowIndex: number, sourceIndex: number, sourceField: string | null): void {
    const entry = this.resourceMappings[rowIndex].sourceMappings[sourceIndex];
    entry.sourceField = sourceField;
    if (sourceField) {
      const parts = sourceField.split('.');
      const entryPart = parts.find(p => p.startsWith('entry:'));
      entry.sourceName = entryPart ? entryPart.replace('entry:', '') : sourceField;
    } else {
      entry.sourceName = null;
    }
  }

  /**
   * Called when a mapping is selected for a source entry
   */
  onResourceMappingChanged(rowIndex: number, sourceIndex: number, mappingId: string | null): void {
    const entry = this.resourceMappings[rowIndex].sourceMappings[sourceIndex];
    entry.mappingId = mappingId;
    if (mappingId) {
      const mapping = this.availableMappings.find(m => m.id === mappingId);
      entry.mappingName = mapping?.name || null;
    } else {
      entry.mappingName = null;
    }
  }

  /**
   * Add a new source mapping entry to a target resource row
   */
  addSourceMapping(rowIndex: number): void {
    this.resourceMappings[rowIndex].sourceMappings.push({
      sourceField: null,
      sourceName: null,
      mappingId: null,
      mappingName: null
    });
  }

  /**
   * Remove a source mapping entry from a target resource row
   */
  removeSourceMapping(rowIndex: number, sourceIndex: number): void {
    const mappings = this.resourceMappings[rowIndex].sourceMappings;
    if (mappings.length > 1) {
      mappings.splice(sourceIndex, 1);
    } else {
      // Keep at least one entry, just clear it
      mappings[0] = {
        sourceField: null,
        sourceName: null,
        mappingId: null,
        mappingName: null
      };
    }
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
   * Called when a copy_from source is selected for a value row
   */
  onValueCopyFromChanged(index: number, sourceField: string | null): void {
    this.valueMappings[index].copyFromSource = sourceField;
    if (sourceField) {
      this.valueMappings[index].action = 'copy_from';
    }
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

  /**
   * Check if a resource mapping row has any mapping assigned
   */
  hasAnyMapping(row: ResourceMappingRow): boolean {
    return row.sourceMappings.some(s => s.mappingId !== null);
  }

  /**
   * Get indent style for nested value fields
   */
  getIndentStyle(depth: number): { [key: string]: string } {
    return {
      'padding-left': `${depth * 20}px`
    };
  }
}
