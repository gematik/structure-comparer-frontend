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
import { Component, OnInit } from '@angular/core';
import { ComparisonService } from '../comparison.service';
import { ActivatedRoute } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { Sort } from '@angular/material/sort';

@Component({
  selector: 'app-profile-comparison',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatTooltip],
  templateUrl: './profile-comparison.component.html',
  styleUrl: './profile-comparison.component.css'
})
export class ProfileComparisonComponent implements OnInit {
  projectKey: string;
  comparisonId: string;
  comparison: any;
  // Paginator
  totalLength: number = 0;
  pageSize: number = 200;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 50, 100, 200, 500];
  originalFields: any[] = [];
  expandedRow: number | null = null;


  constructor(private route: ActivatedRoute, private comparisonService: ComparisonService) { this.projectKey = ""; this.comparisonId = ""; }
  private readonly DEBUG = true;

  dbg(...args: any[]) {
    if (this.DEBUG) console.log('[ProfileComparison]', ...args);
  }

  dbgTable(label: string, rows: any[]) {
    if (this.DEBUG && console.table) {
      console.log(`[ProfileComparison] ${label}`);
      console.table(rows);
    }
  }

  norm(v: unknown): string {
    return (v ?? '').toString().trim().toLowerCase();
  }

  onSort(e: Sort): void {
    const data = [...(this.comparison?.fields ?? [])]; // Kopie, wichtig!

    if (!e.active || !e.direction) {
      this.dbg('Sort reset (no active/direction)');
      // optional: ursprüngliche Reihenfolge wiederherstellen
      this.comparison.fields = [...this.comparison.fields];
      return;
    }

    const isAsc = e.direction === 'asc';
    const compare = (a: string | number, b: string | number) =>
      ((a ?? '') < (b ?? '') ? -1 : (a ?? '') > (b ?? '') ? 1 : 0) * (isAsc ? 1 : -1);

    const sorted = data.sort((a: any, b: any) => {
      switch (e.active) {
        case 'name':
          return compare(a?.name ?? '', b?.name ?? '');
        case 'classification':
          return compare(a?.classification ?? '', b?.classification ?? '');
        default:
          return 0;
      }
    });

    this.dbg('Sort applied', { by: e.active, dir: e.direction, count: sorted.length });
    this.dbgTable('First 10 after sort', sorted.slice(0, 10));
    this.comparison.fields = sorted;
  }

  ngOnInit(): void {
    this.projectKey = this.route.snapshot.paramMap.get('projectKey') || '';
    this.comparisonId = this.route.snapshot.paramMap.get('comparisonId') || '';
    console.log("ProjectKey: ", this.projectKey)
    console.log("ComparisonId: ", this.comparisonId)
    if (this.projectKey && this.comparisonId) {
      console.log("Test")
      this.loadComparison(this.projectKey, this.comparisonId);
    }
  }

  loadComparison(projectKey: string, comparisonId: string) {
    this.comparisonService
      .getComparisonData(projectKey, comparisonId)
      .pipe(
        catchError((err) => {
          console.error('Error loading mapping detail', err);
          return of({});
        })
      )
      .subscribe((comparison) => {
        console.log('comparison', comparison);

        // initial: classification DESC
        const sortedFields = [...(comparison.fields ?? [])].sort((a: any, b: any) => {
          const A = (a?.classification ?? '').toString();
          const B = (b?.classification ?? '').toString();
          return A < B ? 1 : A > B ? -1 : 0; // DESC
        });

        this.comparison = { ...comparison, fields: sortedFields };
        this.originalFields = [...sortedFields];
      });

  }

  loadComparisonCSSProperty(compatibility: string): string {
    const CSS_CLASS: { [key: string]: string } = {
      compatible: 'compatible',
      warning: 'warning',
      incompatible: 'incompatible',
    };
    return CSS_CLASS[compatibility] || '';
  }

  getTooltipComparison(field: any): string {

    return this.comparisonService.getClassificationDescription(field);
  }


  toggleRow(index: number) {
    this.expandedRow = this.expandedRow === index ? null : index;
  }

  filterComparisonFields(event: Event): void {
    const raw = (event.target as HTMLInputElement)?.value ?? '';
    const val = this.norm(raw);

    const totalBefore = this.originalFields.length;
    const wantIncompatible = ['incompatible', 'incompat', 'incomp'].includes(val);

    this.dbg('Filter input', { raw, val, wantIncompatible, totalBefore });

    const filtered = this.originalFields.filter((field: any) => {
      const name = this.norm(field?.name);
      const cls = this.norm(field?.classification);

      const matches = wantIncompatible ? (cls === 'incompatible') : (
        !val || name.includes(val) || cls.includes(val)
      );

      if (this.DEBUG && val) {
        console.groupCollapsed(`[filter] ${field?.name ?? '(no name)'} -> ${matches ? '✔' : '✘'}`);
        console.log('name:', name);
        console.log('classification:', cls);
        console.log('wantIncompatible:', wantIncompatible);
        console.groupEnd();
      }

      return matches;
    });

    this.dbg('Filter result', { totalAfter: filtered.length });
    this.dbgTable('First 10 filtered rows', filtered.slice(0, 10));
    this.comparison.fields = filtered;
  }
}
