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
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TransformationService } from '../transformation.service';
import { ProjectService } from '../project.service';
import { Transformation, TransformationField, MappingReference, TransformationMappingLinkRequest } from '../models/transformation.model';
import { Mapping } from '../models/mapping.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/**
 * UI model for a resource mapping row
 */
interface ResourceMappingRow {
  sourceField: string;
  sourceName: string;
  mappingId: string | null;
  mappingName: string | null;
  targetField: string | null;
  originalMappingId: string | null;
  originalTargetField: string | null;
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
    MatFormFieldModule
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

  // Resource mapping UI model
  resourceMappings: ResourceMappingRow[] = [];
  targetResourceFields: { name: string; displayName: string }[] = [];

  // Track original state for change detection
  private originalResourceMappings: string = '';

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
          this.buildResourceMappings();
        }
        this.loading = false;
      });
  }

  /**
   * Build the resource mappings from fields that end with ".resource"
   */
  private buildResourceMappings(): void {
    // Filter fields that end with "resource" (case insensitive)
    const resourceFields = this.fields.filter(f =>
      f.name.toLowerCase().endsWith('.resource') ||
      f.name.toLowerCase().endsWith('resource')
    );

    // Build source resource list
    this.resourceMappings = resourceFields.map(field => {
      // Extract a friendly name from the field path
      const parts = field.name.split('.');
      const entryPart = parts.find(p => p.startsWith('entry:'));
      const sourceName = entryPart ? entryPart.replace('entry:', '') : field.name;

      return {
        sourceField: field.name,
        sourceName: sourceName,
        mappingId: field.map || null,
        mappingName: field.map_name || null,
        targetField: field.other || null,
        originalMappingId: field.map || null,
        originalTargetField: field.other || null
      };
    });

    // Build target resource options from target profile fields
    this.buildTargetResourceFields();

    // Store original state for change detection
    this.originalResourceMappings = JSON.stringify(this.resourceMappings.map(r => ({
      mappingId: r.mappingId,
      targetField: r.targetField
    })));
  }

  /**
   * Build target resource field options from transformation fields
   * Look for fields in the target profile that could be resource destinations
   */
  private buildTargetResourceFields(): void {
    // Load target profile fields from backend if we have a target profile
    if (this.transformation?.target?.id) {
      this.loadTargetProfileFields(this.transformation.target.id);
    } else {
      // Fallback: derive from transformation fields
      this.deriveTargetFieldsFromTransformation();
    }
  }

  /**
   * Load target profile fields from the backend API
   */
  private loadTargetProfileFields(profileId: string): void {
    this.projectService.getProfileDetails(this.projectKey, profileId)
      .pipe(catchError((err: unknown) => {
        console.error('Error loading target profile fields', err);
        // Fallback to deriving from transformation fields
        this.deriveTargetFieldsFromTransformation();
        return of(null);
      }))
      .subscribe(profile => {
        if (profile && profile.fields) {
          // Filter for fields that end with .resource
          const resourceFields = Object.keys(profile.fields)
            .filter(fieldPath =>
              fieldPath.toLowerCase().endsWith('.resource') ||
              fieldPath.toLowerCase().includes('parameter') && fieldPath.toLowerCase().includes('resource')
            )
            .sort();

          this.targetResourceFields = resourceFields.map(fieldPath => {
            // Create display-friendly name
            const parts = fieldPath.split('.');
            const paramPart = parts.find(p => p.startsWith('parameter:'));
            const partPart = parts.find(p => p.startsWith('part:'));
            let displayName = fieldPath;
            if (paramPart) {
              displayName = paramPart.replace('parameter:', '');
              if (partPart) {
                displayName += '.' + partPart.replace('part:', '');
              }
              displayName += '.resource';
            }
            return { name: fieldPath, displayName };
          });

          // If no resource fields found in profile, fallback
          if (this.targetResourceFields.length === 0) {
            this.deriveTargetFieldsFromTransformation();
          }
        }
      });
  }

  /**
   * Fallback: derive target fields from transformation field data
   */
  private deriveTargetFieldsFromTransformation(): void {
    // Get unique "other" values from fields that could be target resources
    const targetFields = this.fields
      .filter(f => f.other && (
        f.other.toLowerCase().includes('resource') ||
        f.other.toLowerCase().includes('parameter')
      ))
      .map(f => f.other!)
      .filter((v, i, a) => a.indexOf(v) === i); // unique

    // Also look for Parameters.parameter:*.resource patterns
    const parameterResourcePattern = /Parameters\.parameter:[^.]+\.(?:part:[^.]+\.)?resource/i;
    const additionalTargets = this.fields
      .filter(f => parameterResourcePattern.test(f.name))
      .map(f => f.name)
      .filter((v, i, a) => a.indexOf(v) === i);

    // Combine and create display-friendly options
    const allTargets = [...new Set([...targetFields, ...additionalTargets])];

    this.targetResourceFields = allTargets.map(name => {
      const parts = name.split('.');
      const paramPart = parts.find(p => p.startsWith('parameter:'));
      const partPart = parts.find(p => p.startsWith('part:'));
      let displayName = name;
      if (paramPart) {
        displayName = paramPart.replace('parameter:', '');
        if (partPart) {
          displayName += '.' + partPart.replace('part:', '');
        }
      }
      return { name, displayName };
    });

    // If no target fields found, create some defaults based on common patterns
    if (this.targetResourceFields.length === 0) {
      this.targetResourceFields = [
        { name: 'Parameters.parameter:rxPrescription.part:medication.resource', displayName: 'rxPrescription.medication' },
        { name: 'Parameters.parameter:rxPrescription.part:medicationRequest.resource', displayName: 'rxPrescription.medicationRequest' },
        { name: 'Parameters.parameter:rxPrescription.part:practitioner.resource', displayName: 'rxPrescription.practitioner' },
        { name: 'Parameters.parameter:rxPrescription.part:organization.resource', displayName: 'rxPrescription.organization' },
      ];
    }
  }

  loadAvailableMappings(): void {
    // Die Mappings werden aus den gecachten Projekt-Daten oder über reload geholt
    const projectData = this.projectService.getProjectData();
    if (projectData && projectData.mappings) {
      this.availableMappings = projectData.mappings;
    } else {
      // Falls keine gecachten Daten, Projekt neu laden
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

  linkMapping(fieldName: string, mappingId: string): void {
    const linkRequest: TransformationMappingLinkRequest = {
      mapping_id: mappingId
    };
    this.transformationService.linkMapping(this.projectKey, this.transformationId, fieldName, linkRequest)
      .subscribe({
        next: () => {
          this.snackBar.open('Mapping erfolgreich verknüpft', 'OK', { duration: 3000 });
          this.loadTransformation();
        },
        error: (err) => {
          console.error('Error linking mapping', err);
          this.snackBar.open('Fehler beim Verknüpfen des Mappings', 'OK', { duration: 5000 });
        }
      });
  }

  unlinkMapping(fieldName: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Mapping-Verknüpfung entfernen',
        message: 'Möchten Sie die Verknüpfung zu diesem Mapping wirklich entfernen?',
        confirmText: 'Entfernen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.transformationService.unlinkMapping(this.projectKey, this.transformationId, fieldName)
          .subscribe({
            next: () => {
              this.snackBar.open('Mapping-Verknüpfung entfernt', 'OK', { duration: 3000 });
              this.loadTransformation();
            },
            error: (err) => {
              console.error('Error unlinking mapping', err);
              this.snackBar.open('Fehler beim Entfernen der Verknüpfung', 'OK', { duration: 5000 });
            }
          });
      }
    });
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

  /**
   * Called when a mapping is selected for a resource row
   */
  onMappingChanged(index: number, mappingId: string | null): void {
    this.resourceMappings[index].mappingId = mappingId;
    if (mappingId) {
      const mapping = this.availableMappings.find(m => m.id === mappingId);
      this.resourceMappings[index].mappingName = mapping?.name || null;
    } else {
      this.resourceMappings[index].mappingName = null;
    }
  }

  /**
   * Called when a target resource is selected for a resource row
   */
  onTargetChanged(index: number, targetField: string | null): void {
    this.resourceMappings[index].targetField = targetField;
  }

  /**
   * Check if there are unsaved changes
   */
  hasChanges(): boolean {
    const currentState = JSON.stringify(this.resourceMappings.map(r => ({
      mappingId: r.mappingId,
      targetField: r.targetField
    })));
    return currentState !== this.originalResourceMappings;
  }

  /**
   * Save all changes to the backend
   */
  saveChanges(): void {
    const changedRows = this.resourceMappings.filter(r =>
      r.mappingId !== r.originalMappingId || r.targetField !== r.originalTargetField
    );

    if (changedRows.length === 0) {
      this.snackBar.open('Keine Änderungen zum Speichern', 'OK', { duration: 2000 });
      return;
    }

    let savedCount = 0;
    let errorCount = 0;

    changedRows.forEach(row => {
      // If mapping was added or changed, or target field changed
      if (row.mappingId && (row.mappingId !== row.originalMappingId || row.targetField !== row.originalTargetField)) {
        const linkRequest: TransformationMappingLinkRequest = {
          mapping_id: row.mappingId,
          other: row.targetField || undefined
        };
        this.transformationService.linkMapping(
          this.projectKey,
          this.transformationId,
          row.sourceField,
          linkRequest
        ).subscribe({
          next: () => {
            savedCount++;
            if (savedCount + errorCount === changedRows.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          },
          error: (err: unknown) => {
            console.error('Error saving mapping link', err);
            errorCount++;
            if (savedCount + errorCount === changedRows.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          }
        });
      }
      // If mapping was removed
      else if (!row.mappingId && row.originalMappingId) {
        this.transformationService.unlinkMapping(
          this.projectKey,
          this.transformationId,
          row.sourceField
        ).subscribe({
          next: () => {
            savedCount++;
            if (savedCount + errorCount === changedRows.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          },
          error: (err: unknown) => {
            console.error('Error removing mapping link', err);
            errorCount++;
            if (savedCount + errorCount === changedRows.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          }
        });
      }
      // If only target field changed (update via updateTransformationField)
      else if (row.targetField !== row.originalTargetField) {
        this.transformationService.updateTransformationField(
          this.projectKey,
          this.transformationId,
          row.sourceField,
          {
            action: 'use',
            other: row.targetField || undefined,
            map: row.mappingId || undefined
          }
        ).subscribe({
          next: () => {
            savedCount++;
            if (savedCount + errorCount === changedRows.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          },
          error: (err: unknown) => {
            console.error('Error updating field', err);
            errorCount++;
            if (savedCount + errorCount === changedRows.length) {
              this.onSaveComplete(savedCount, errorCount);
            }
          }
        });
      }
    });
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
