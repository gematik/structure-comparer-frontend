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
import { Transformation, TransformationField, MappingReference, TransformationFieldUpdateRequest } from '../models/transformation.model';
import { Mapping, MappingAction } from '../models/mapping.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/**
 * UI model for a resource mapping row (target-centric)
 * The target resource is fixed, user selects source and mapping
 */
interface ResourceMappingRow {
  targetField: string;
  targetName: string;
  sourceField: string | null;
  sourceName: string | null;
  mappingId: string | null;
  mappingName: string | null;
  originalSourceField: string | null;
  originalMappingId: string | null;
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
          this.buildMappings();
        }
        this.loading = false;
      });
  }

  /**
   * Build both resource and value mappings from transformation fields
   */
  private buildMappings(): void {
    this.buildResourceMappings();
    this.buildValueMappings();
    this.buildSourceFields();
  }

  /**
   * Build the resource mappings from TARGET fields that have type "Resource"
   * User will select which source resource maps to each target
   */
  private buildResourceMappings(): void {
    // Get the target profile key
    const targetKey = this.transformation?.target?.key || this.transformation?.target?.id;
    if (!targetKey) return;

    // Filter target fields that have Resource type
    const targetResourceFields = this.fields.filter(f => {
      const profile = f.profiles?.[targetKey];
      if (!profile) return false;
      // Check if types include Resource
      const types = profile.types || [];
      return types.some(t => t === 'Resource' || t.endsWith('Resource'));
    });

    // Also include fields that end with .resource
    const resourcePatternFields = this.fields.filter(f =>
      f.name.toLowerCase().endsWith('.resource') &&
      !targetResourceFields.find(rf => rf.name === f.name)
    );

    const allTargetResourceFields = [...targetResourceFields, ...resourcePatternFields];

    // Build target resource rows
    this.resourceMappings = allTargetResourceFields.map(field => {
      const parts = field.name.split('.');
      const paramPart = parts.find(p => p.startsWith('parameter:'));
      const partPart = parts.find(p => p.startsWith('part:'));
      let targetName = field.name;
      if (paramPart) {
        targetName = paramPart.replace('parameter:', '');
        if (partPart) {
          targetName += '.' + partPart.replace('part:', '');
        }
        targetName += '.resource';
      }

      // Find existing source mapping (from 'other' field)
      const sourceField = field.other || null;
      let sourceName: string | null = null;
      if (sourceField) {
        const sourceParts = sourceField.split('.');
        const entryPart = sourceParts.find(p => p.startsWith('entry:'));
        sourceName = entryPart ? entryPart.replace('entry:', '') : sourceField;
      }

      return {
        targetField: field.name,
        targetName: targetName,
        sourceField: sourceField,
        sourceName: sourceName,
        mappingId: field.map || null,
        mappingName: field.map_name || null,
        originalSourceField: sourceField,
        originalMappingId: field.map || null
      };
    });

    this.applyResourceFilter();

    // Store original state
    this.originalResourceMappings = JSON.stringify(this.resourceMappings.map(r => ({
      sourceField: r.sourceField,
      mappingId: r.mappingId
    })));
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
   * Build source field options from source profiles
   */
  private buildSourceFields(): void {
    if (!this.transformation?.sources?.length) return;

    // Build source resource fields from source profiles
    this.sourceResourceFields = [];
    this.sourceValueFields = [];

    this.transformation.sources.forEach(source => {
      const sourceKey = source.key || source.id;
      if (!sourceKey) return;

      this.fields.forEach(field => {
        const profile = field.profiles?.[sourceKey];
        if (!profile) return;

        const types = profile.types || [];
        const isResource = types.some(t => t === 'Resource' || t.endsWith('Resource')) ||
                          field.name.toLowerCase().endsWith('.resource');

        // Create display name
        const parts = field.name.split('.');
        let displayName = field.name;

        if (isResource) {
          const entryPart = parts.find(p => p.startsWith('entry:'));
          if (entryPart) {
            displayName = entryPart.replace('entry:', '') + '.resource';
          }
          this.sourceResourceFields.push({
            name: field.name,
            displayName: displayName,
            profileKey: sourceKey
          });
        } else {
          displayName = parts[parts.length - 1].replace(/:\w+$/, '');
          this.sourceValueFields.push({
            name: field.name,
            displayName: displayName,
            profileKey: sourceKey
          });
        }
      });
    });

    // Remove duplicates
    this.sourceResourceFields = this.sourceResourceFields.filter((v, i, a) =>
      a.findIndex(t => t.name === v.name) === i
    );
    this.sourceValueFields = this.sourceValueFields.filter((v, i, a) =>
      a.findIndex(t => t.name === v.name) === i
    );
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
   * Called when a source resource is selected for a target row
   */
  onSourceResourceChanged(index: number, sourceField: string | null): void {
    this.resourceMappings[index].sourceField = sourceField;
    if (sourceField) {
      const parts = sourceField.split('.');
      const entryPart = parts.find(p => p.startsWith('entry:'));
      this.resourceMappings[index].sourceName = entryPart ? entryPart.replace('entry:', '') : sourceField;
    } else {
      this.resourceMappings[index].sourceName = null;
    }
  }

  /**
   * Called when a mapping is selected for a resource row
   */
  onResourceMappingChanged(index: number, mappingId: string | null): void {
    this.resourceMappings[index].mappingId = mappingId;
    if (mappingId) {
      const mapping = this.availableMappings.find(m => m.id === mappingId);
      this.resourceMappings[index].mappingName = mapping?.name || null;
    } else {
      this.resourceMappings[index].mappingName = null;
    }
  }

  /**
   * Check if there are unsaved resource changes
   */
  hasResourceChanges(): boolean {
    const currentState = JSON.stringify(this.resourceMappings.map(r => ({
      sourceField: r.sourceField,
      mappingId: r.mappingId
    })));
    return currentState !== this.originalResourceMappings;
  }

  /**
   * Save resource mapping changes
   */
  saveResourceChanges(): void {
    const changedRows = this.resourceMappings.filter(r =>
      r.sourceField !== r.originalSourceField || r.mappingId !== r.originalMappingId
    );

    if (changedRows.length === 0) {
      this.snackBar.open('Keine Änderungen zum Speichern', 'OK', { duration: 2000 });
      return;
    }

    let savedCount = 0;
    let errorCount = 0;

    changedRows.forEach(row => {
      // Update the target field with the source reference and mapping
      const updateRequest: TransformationFieldUpdateRequest = {
        action: 'use',
        other: row.sourceField || undefined,
        map: row.mappingId || undefined
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
          console.error('Error saving resource mapping', err);
          errorCount++;
          if (savedCount + errorCount === changedRows.length) {
            this.onSaveComplete(savedCount, errorCount);
          }
        }
      });
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
   * Get indent style for nested value fields
   */
  getIndentStyle(depth: number): { [key: string]: string } {
    return {
      'padding-left': `${depth * 20}px`
    };
  }
}
