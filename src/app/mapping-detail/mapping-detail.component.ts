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
 *
 * *******
 *
 * For additional notes and disclaimer from gematik and in case of changes by gematik find details in the "Readme" file.
 */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MappingsService } from '../mappings.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { ComparisonService } from '../comparison.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EditPropertyActionDialogComponent, EditPropertyActionDialogData } from '../edit-property-action-dialog/edit-property-action-dialog.component';
import { ActionOption as ActionOptionModel, MappingField, MappingFieldUpdateRequest } from '../models/mapping.model';

export interface IProfile {
  name?: string;
  extra?: string;
  action?: string;
  remark?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-mapping-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatButtonModule,
    MatTooltip
  ],
  templateUrl: './mapping-detail.component.html',
  styleUrls: ['./mapping-detail.component.css'],
})
export class MappingDetailComponent implements OnInit {

  projectKey: string;
  mappingId: string;
  original: any;
  mapping: any;
  availableFields: any[] = [];
  classifications: ActionOptionModel[] = [];
  editingIndex: number | null | undefined = null;
  hoverIndex: number | null | undefined = null;
  filtered: any;

  // Dynamische Spalten: alle Source-Profile + Target-Profile
  profileColumns: Array<{ key: string; name: string; url?: string }> = [];

  // Paginator
  totalLength: number = 0;
  pageSize: number = 200;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 50, 100, 200, 500];

  constructor(
    private route: ActivatedRoute,
    private mappingsService: MappingsService,
    private comparisonService: ComparisonService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.projectKey = "";
    this.mappingId = "";
  }

  private readonly DEBUG = false;

  private dbg(...args: any[]) {
    if (this.DEBUG) console.log('[MappingDetail]', ...args);
  }
  private dbgTable(label: string, rows: any[]) {
    if (this.DEBUG && console.table) {
      console.log(`[MappingDetail] ${label}`);
      console.table(rows);
    }
  }

  // Für konsistentes, null-sicheres Normalisieren
  private norm(v: unknown): string {
    return (v ?? '').toString().trim().toLowerCase();
  }

  ngOnInit(): void {
    this.projectKey = this.route.snapshot.paramMap.get('projectKey') || '';
    this.mappingId = this.route.snapshot.paramMap.get('mappingId') || '';
    if (this.projectKey && this.mappingId) {
      this.loadMapping(this.projectKey, this.mappingId);
      this.loadFields(this.projectKey, this.mappingId);
      this.loadActions();
    }
  }

  loadMapping(projectKey: string, mappingId: string) {
    this.mappingsService
      .getMapping(projectKey, mappingId)
      .pipe(
        catchError((err) => {
          console.error('Error loading mapping detail', err);
          return of({});
        })
      )
      .subscribe((mapping) => {
        console.log('mapping', mapping);

        // initial: classification DESC
        const sortedFields = [...(mapping.fields ?? [])].sort((a: any, b: any) => {
          const A = (a?.classification ?? '').toString();
          const B = (b?.classification ?? '').toString();
          return A < B ? 1 : A > B ? -1 : 0; // DESC
        });

        const sortedMapping = { ...mapping, fields: sortedFields };

        // Profilspalten (alle Sources + Target) für die Kopfzeile aufbauen
        const sources = Array.isArray(sortedMapping.sources) ? sortedMapping.sources : [];
        const targetArr = sortedMapping.target ? [sortedMapping.target] : [];
        this.profileColumns = [...sources, ...targetArr];

        this.totalLength = sortedFields.length;
        this.original = sortedMapping;
        this.mapping = sortedMapping;
        this.filtered = {
          ...sortedMapping,
          fields: sortedFields.slice(0, this.pageSize),
        };
      });
  }

  getDescriptionForMapping(useValue: string): string | undefined {
    return this.classifications.find(item => item.value === useValue)?.description;
  }

  getTooltipComparison(field: any): string {
    return this.comparisonService.getClassificationDescription(field);
  }

  loadFields(projectKey: string, mappingId: string) {
    this.mappingsService
      .getMappingFields(projectKey, mappingId)
      .pipe(
        catchError((err) => {
          console.error('Error loading fields', err);
          return of([]);
        })
      )
      .subscribe((fields) => (this.availableFields = fields.fields));
  }

  saveFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9._-]+/g, "_") // alle Sonderzeichen -> _
      .replace(/_+/g, "_")              // mehrere _ auf eins reduzieren
      .replace(/^_+|_+$/g, "");         // führende/abschließende _ entfernen
  }

  getStaticMappings() {
    const filenameBase = this.sanitizeFilename(this.filtered.name);
    const filename = `${filenameBase}.html`;

    this.mappingsService
      .getStaticMapping(this.projectKey, this.mappingId, true, true)
      .pipe(
        catchError((err) => {
          console.error('Error loading static mappings', err);
          return of([]);
        })
      )
      .subscribe((data) => {
        console.log('static mappings', data);
        this.saveFile(data, filename);
      });
  }

  loadActions() {
    this.mappingsService
      .getActions()
      .pipe(
        catchError((err) => {
          console.error('Error loading classifications', err);
          return of([]);
        })
      )
      .subscribe((data) => {
        console.log('actions', data);
        this.classifications = data.actions;
        console.log('classifications', this.classifications);
      });
  }

  getClassificationInstruction(action: string): string {
    const found = this.classifications.find((c: any) => c.value === action);
    return found ? found.description : '';
  }

  private clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

formatCardinality(minVal: any, maxVal: any): string {
  const min = Number.isFinite(+minVal) ? +minVal : 0;
  const max = (maxVal === '*' || maxVal === '∞') ? '*' : (Number.isFinite(+maxVal) ? +maxVal : 0);
  return `${min} .. ${max}`;
}

/**
 * Erzeugt eine HSL-Farbskala:
 * - 0..0  => hue ~ 0 (rot)
 * - 0..*  => hue ~ 130 (grün)
 * - Zwischenwerte interpoliert:
 *   - je kleiner min, desto „offener“ => mehr Grün
 *   - je größer max (oder '*'), desto „offener“ => mehr Grün
 */
getCardinalityStyle(minVal: any, maxVal: any): {[k: string]: string} {
  const min = Number.isFinite(+minVal) ? +minVal : 0;

  // Max als Zahl normalisieren: '*' / '∞' gelten als sehr offen
  const maxIsStar = (maxVal === '*' || maxVal === '∞');
  const maxNum = maxIsStar ? 10 : (Number.isFinite(+maxVal) ? +maxVal : 0);

  // Normierung: min ∈ [0,2], max ∈ [0,10]
  const minN = 1 - (this.clamp(min, 0, 2) / 2);   // 1 = offen (min=0), 0 = geschlossen (min=2)
  const maxN = (this.clamp(maxNum, 0, 10) / 10);  // 0 = geschlossen (max=0), 1 = offen (max='*'≈10)

  // Openness ∈ [0..1]
  const openness = this.clamp(0.5 * minN + 0.5 * maxN, 0, 1);

  // Hue von Rot (0) bis Grün (~130)
  const hue = Math.round(0 + openness * 130);

  // Lesbare Badge-Farben (heller Hintergrund, kontrastierender Text & Border)
  const bg = `hsl(${hue}, 90%, 92%)`;
  const border = `hsl(${hue}, 65%, 45%)`;
  const text = `hsl(${hue}, 60%, 25%)`;

  return {
    backgroundColor: bg,
    color: text,
    borderColor: border
  };
}

  getRemarkTooltip(field: any): string {
    switch (field.action) {
      case 'use':
        return 'No action needed for this mapping';
      case 'not_use':
      case 'empty':
        return 'Information will be removed or left empty in this mapping';
      case 'extension':
      case 'manual':
        return 'Special action required for this mapping';
      case 'other':
      case 'medication_service':
        return 'Caution reference!';
      case 'copy_from':
        return `This field copies its value from the following field: ${field.other}`;
      case 'copy_to':
        return `This field copies its value into the following field: ${field.other}`;
      case 'fixed':
        return `This field has a fixed value: ${field.fixed}`;
      default:
        return 'No additional information';
    }
  }

  /**
   * Gets the mapping result text to display in the table
   * Shows the concrete result/target of the mapping action
   */
  getMappingResult(field: any): string {
    switch (field.action) {
      case 'copy_from':
        return field.other ? `🔄 Kopiert von: ${field.other}` : '';
      case 'copy_to':
        return field.other ? `🔄 Kopiert zu: ${field.other}` : '';
      case 'fixed':
        return field.fixed ? `📌 Fester Wert: "${field.fixed}"` : '';
      case 'manual':
        return field.remark ? `✋ Manuell: ${field.remark}` : '✋ Manuelle Bearbeitung erforderlich';
      case 'extension':
        return field.remark ? `🔧 Extension: ${field.remark}` : '🔧 Extension-Behandlung';
      case 'not_use':
        return '❌ Wird nicht verwendet';
      case 'empty':
        return '🗑️ Wird geleert';
      case 'use':
        return '✅ Wird übernommen';
      case 'other':
        return '⚠️ Sonderbehandlung';
      case 'medication_service':
        return '💊 Medikations-Service';
      default:
        return '';
    }
  }

  /**
   * Gets consolidated mapping text that combines all relevant information
   * Replaces the separate displays of result and remark
   */
  getConsolidatedMappingText(field: any): string {
    const parts: string[] = [];
    
    switch (field.action) {
      case 'copy_from':
        if (field.other) {
          parts.push(`← Kopiert von: ${field.other}`);
        }
        break;
      case 'copy_to':
        if (field.other) {
          parts.push(`→ Kopiert zu: ${field.other}`);
        }
        break;
      case 'fixed':
        if (field.fixed) {
          parts.push(`Fester Wert: "${field.fixed}"`);
        }
        break;
      case 'manual':
        if (field.remark) {
          parts.push(`Manuell: ${field.remark}`);
        } else {
          parts.push('Manuelle Bearbeitung erforderlich');
        }
        break;
      case 'extension':
        if (field.remark) {
          parts.push(`Extension: ${field.remark}`);
        } else {
          parts.push('Extension-Behandlung');
        }
        break;
      case 'not_use':
        parts.push('Wird nicht verwendet');
        break;
      case 'empty':
        parts.push('Wird geleert');
        break;
      case 'use':
        parts.push('Wird direkt übernommen');
        break;
      case 'other':
        parts.push('Sonderbehandlung erforderlich');
        break;
      case 'medication_service':
        parts.push('Medikations-Service Integration');
        break;
    }
    
    return parts.join(' • ');
  }

  isProfilePresent(fieldProfiles: { [key: string]: any }, profileName: string): boolean {
    return !!fieldProfiles[profileName];
  }

  handleTable = (e: any) => {
    const paginator = () => {
      this.pageSize = e.pageSize;
      this.pageIndex = e.pageIndex;
      this.filtered = {
        ...this.mapping,
        fields: this.mapping.fields.slice(
          this.pageSize * this.pageIndex,
          this.pageSize * (this.pageIndex + 1)
        ),
      };
    };

    const sorter = () => {
      const data = [...(this.filtered?.fields ?? [])]; // Kopie
      if (!e.active || e.direction === '') {
        this.filtered = { ...this.filtered, fields: data };
        return;
      }
      const isAsc = e.direction === 'asc';

      const sortedData = data.sort((a: IProfile, b: IProfile) => {
        switch (e.active) {
          case 'name':
          case 'remark':
            return compare((a[e.active] ?? ''), (b[e.active] ?? ''), isAsc);
          case 'extra':
            return compare(
              ((a as any)?.classification ?? '') + (a['extra'] ?? ''),
              ((b as any)?.classification ?? '') + (b['extra'] ?? ''),
              isAsc
            );
          case 'compatibility':
            return compare(((a as any)?.classification ?? ''), ((b as any)?.classification ?? ''), isAsc);
          default:
            // Dynamische Profilspalten wie "profile-<key>"
            if (e.active?.startsWith('profile-')) {
              const key = e.active.substring('profile-'.length);
              const getTuple = (row: any) => {
                const p = row?.profiles?.[key];
                if (!p) return [-1, -1, -1]; // nicht vorhanden -> stabil ganz unten/oben
                const ms = p.must_support ? 1 : 0;
                const nMin = Number.isFinite(+p.min) ? +p.min : 0;
                const nMax =
                  p.max === '*' || p.max === '∞'
                    ? Number.POSITIVE_INFINITY
                    : (Number.isFinite(+p.max) ? +p.max : 0);
                return [nMin, nMax, ms];
              };
              return tupleCompare(getTuple(a), getTuple(b), isAsc);
            }
            return 0;
        }
      });

      this.dbg('Sort result:', { by: e.active, direction: e.direction, count: sortedData.length });
      this.filtered = { ...this.filtered, fields: sortedData };
    };

    const filter = () => {
      // Eingabetext ermitteln
      const raw = (e?.target as HTMLInputElement)?.value ?? '';
      const val = this.norm(raw);
      const totalBefore = this.original?.fields?.length ?? 0;

      this.dbg('Filter input:', { raw, val, totalBefore });

      // Heuristik: Wenn Nutzer „incompatible“ (oder Präfixe) tippt,
      // prüfe zusätzlich field.classification.
      const wantIncompatible = ['incompatible', 'incompat', 'incomp'].includes(val);

      // Entscheidungslogik je Zeile
      const filterCond = (record: IProfile) => {
        const name = this.norm(record?.name);
        const remark = this.norm(record?.remark);
        const action = this.norm(record?.action);
        const extra = this.norm(record?.extra);
        const classif = this.norm((record as any)?.classification);

        let matches: boolean;

        if (wantIncompatible) {
          // Spezielle Debug-Route für "incompatible"
          matches = classif === 'incompatible';
        } else {
          matches =
            !val ||
            name.includes(val) ||
            remark.includes(val) ||
            action.includes(val) ||
            extra.includes(val) ||
            classif.includes(val);
        }

        // Detailliertes per-Record-Logging (nur bei aktivem Filter & DEBUG)
        if (this.DEBUG && val) {
          console.groupCollapsed(`[filter] ${record?.name ?? '(ohne name)'} -> ${matches ? '✔' : '✘'}`);
          console.log('name:', name);
          console.log('remark:', remark);
          console.log('action:', action);
          console.log('extra:', extra);
          console.log('classification:', classif);
          console.log('wantIncompatible:', wantIncompatible);
          console.groupEnd();
        }

        return matches;
      };

      // Filtern
      const filteredFields = (this.original?.fields ?? []).filter(filterCond);
      const totalAfter = filteredFields.length;
      this.dbg('Filter result:', { totalBefore, totalAfter });

      // Ein paar Beispiele tabellarisch anzeigen
      this.dbgTable('First 10 filtered rows', filteredFields.slice(0, 10));

      // State aktualisieren + Pagination neu anwenden
      this.mapping = { ...this.mapping, fields: filteredFields };
      this.totalLength = filteredFields.length;
      this.pageIndex = 0;

      this.filtered = {
        ...this.mapping,
        fields: filteredFields.slice(
          this.pageSize * this.pageIndex,
          this.pageSize * (this.pageIndex + 1)
        ),
      };
    };

    return { paginator, sorter, filter };
  };

  handleEdit = (idx?: number) => {
    const startHover = () => {
      if (this.editingIndex === null) {
        this.hoverIndex = idx;
      }
    };

    const stopHover = () => {
      this.hoverIndex = null;
    };

    const startEdit = () => {
      this.editingIndex = idx;
    };

    const cancelEdit = () => {
      this.editingIndex = null;
    };

    return { startHover, stopHover, startEdit, cancelEdit };
  };

  getClassificationCssClass(action: string): string {
    const CSS_CLASS: { [key: string]: string } = {
      use: 'row-use',
      not_use: 'row-not-use',
      empty: 'row-empty',
      extension: 'row-extension',
      manual: 'row-manual',
      other: 'row-other',
      copy_from: 'row-copy-from',
      copy_to: 'row-copy-to',
      fixed: 'row-fixed',
      medication_service: 'row-medication-service',
    };
    return CSS_CLASS[action] || '';
  }

  // ToDo: Es ist die Frage, was hier im Body sein muss?! Das ist aktuell das einzige Problem. Die Dokue ist da nicht so aussagekräftig.
  confirmChanges(field: any) {
    console.log('Confirming changes for field:', field);
    let action: string;
    const updateData: any = {};
    switch (field.action) {
      case 'copy_from':
        action = 'copy_from';
        updateData.other = field.targetField;
        break;
      case 'copy_to':
        action = 'copy_to';
        updateData.other = field.targetField;
        break;
      case 'fixed':
        action = 'fixed';
        updateData.fixed = field.fixedValue;
        break;
      case 'not_use':
        action = 'not_use';
        break;
      case 'use':
        action = 'use';
        break;
      case 'empty':
        action = 'empty';
        break;
      case 'manual':
        action = 'manual';
        break;
      default:
        console.error('Unknown userClassification:', field.use);
        return;
    }

    console.log('Update Data:', updateData);

    this.mappingsService
      .updateMappingField(this.projectKey, this.mapping.id, field.name, action, updateData)
      .subscribe({
        next: () => {
          this.loadMapping(this.projectKey, this.mapping.id);
        },
        error: (err) => console.error('Failed to update field', err),
      });

    this.handleEdit().cancelEdit();
  }

  /**
   * Opens the property action edit dialog
   */
  openEditPropertyActionDialog(field: MappingField, fieldIndex: number): void {
    const dialogData: EditPropertyActionDialogData = {
      field: field,
      availableActions: this.classifications,
      availableFields: this.availableFields,
      projectKey: this.projectKey,
      mappingId: this.mappingId
    };

    const dialogRef = this.dialog.open(EditPropertyActionDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: MappingFieldUpdateRequest) => {
      if (result) {
        this.updateFieldAction(field.name, result);
      }
    });
  }

  /**
   * Updates a field's action via the API
   */
  private updateFieldAction(fieldName: string, updateRequest: MappingFieldUpdateRequest): void {
    this.mappingsService.updateMappingFieldAction(this.projectKey, this.mappingId, fieldName, updateRequest)
      .pipe(
        catchError((error) => {
          console.error('Error updating field action:', error);
          this.snackBar.open('Fehler beim Speichern der Mapping-Action', 'Schließen', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.snackBar.open('Mapping-Action erfolgreich gespeichert', 'Schließen', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });

          // Reload mapping data to reflect changes
          this.loadMapping(this.projectKey, this.mappingId);
        }
      });
  }
}

const compare = (a: number | string, b: number | string, isAsc: boolean) => {
  const A = (a ?? '') as any;
  const B = (b ?? '') as any;
  return (A < B ? -1 : A > B ? 1 : 0) * (isAsc ? 1 : -1);
};



const tupleCompare = (A: Array<number>, B: Array<number>, isAsc: boolean) => {
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const a = A[i] ?? 0;
    const b = B[i] ?? 0;
    if (a < b) return isAsc ? -1 : 1;
    if (a > b) return isAsc ? 1 : -1;
  }
  return 0;
};


