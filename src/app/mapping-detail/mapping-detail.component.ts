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

export interface IProfile {
  name?: string;
  extra?: string;
  action?: string;
  remark?: string;
  [key: string]: any;
}

type ActionOption = {
  value: string;        // z. B. "use", "manual", ...
  remark?: string;      // nur für "manual" relevant
  instruction?: string; // allgemeine Beschreibung/Label
};



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
    MatIcon,
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
  classifications: any[] = [];
  editingIndex: number | null | undefined = null;
  hoverIndex: number | null | undefined = null;
  filtered: any;
  // Paginator
  totalLength: number = 0;
  pageSize: number = 200;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 50, 100, 200, 500];
  expandedRow: number | null = null;


  constructor(
    private route: ActivatedRoute,
    private mappingsService: MappingsService,
    private comparisonService: ComparisonService

  ) { this.projectKey = ""; this.mappingId = ""; }



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
    this.mappingsService.getActions().pipe(catchError((err) => {
      console.error('Error loading classifications', err);
      return of([]);
    })
    ).subscribe((data) => {
      console.log('actions', data);
      this.classifications = data.actions;
      console.log('classifications', this.classifications);
    });
  }

  getClassificationInstruction(action: string): string {
    const found = this.classifications.find(c => c.value === action);
    return found ? found.description : '';
  }

  toggleRow(index: number) {
    this.expandedRow = this.expandedRow === index ? null : index;
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
        return `This field copies its value from the following field: ${field.other}`
      case 'copy_to':
        return `This field copies its value into the following field: ${field.other}`;
      case 'fixed':
        return `This field has a fixed value: ${field.fixed}`;
      default:
        return 'No additional information';
    }
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
          matches = !val || name.includes(val) || remark.includes(val) || action.includes(val) || extra.includes(val) || classif.includes(val);
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

  // ToDo: Es ist die Frage, was hier im Body sein muss?! Das ist aktuell das einzige Problem. Die Dokue ist da nicht so aussagekrÃ¤ftig.
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
}

const compare = (a: number | string, b: number | string, isAsc: boolean) => {
  const A = (a ?? '') as any;
  const B = (b ?? '') as any;
  return (A < B ? -1 : A > B ? 1 : 0) * (isAsc ? 1 : -1);
};
