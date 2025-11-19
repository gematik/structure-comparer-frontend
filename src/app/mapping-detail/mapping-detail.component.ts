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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EditPropertyActionDialogComponent, EditPropertyActionDialogData } from '../edit-property-action-dialog/edit-property-action-dialog.component';
import { ActionOption as ActionOptionModel, MappingField, MappingFieldUpdateRequest } from '../models/mapping.model';
import { TreeTableComponent, TreeTableConfig } from '../shared/tree-table/tree-table.component';

// Imported helpers for cleaner code organization
import {
  CardinalityHelper,
  StatusHelper,
  MappingTextHelper,
  SummaryHelper,
  EvaluationHelper,
  normalizeString,
  ACTION_CSS,
  StatusSummary,
  ProcessingStatus,
} from './mapping-detail-helpers';

const LEGACY_CLASSIFICATION_CLASS: Record<string, string> = {
  compatible: 'status-ok',
  warning: 'status-warning',
  incompatible: 'status-incompatible',
};

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
    MatTooltip,
    MatIcon,
    TreeTableComponent
  ],
  templateUrl: './mapping-detail.component.html',
  styleUrls: ['./mapping-detail.component.css'],
})
export class MappingDetailComponent implements OnInit {
  // Component properties
  projectKey: string = '';
  mappingId: string = '';
  original: any;
  mapping: any;
  availableFields: any[] = [];
  classifications: ActionOptionModel[] = [];
  editingIndex: number | null = null;
  hoverIndex: number | null = null;
  filtered: any;
  currentQuickFilter: string | null = null;

  // Profile columns and view settings
  profileColumns: Array<{ key: string; name: string; url?: string }> = [];
  viewMode: 'flat' | 'tree' = 'flat';
  treeTableConfig: TreeTableConfig = { profileColumns: [] };

  // Pagination
  totalLength: number = 0;
  pageSize: number = 200;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 50, 100, 200, 500];

  // Debug configuration
  private readonly DEBUG = false;

  constructor(
    private route: ActivatedRoute,
    private mappingsService: MappingsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  // === LIFECYCLE & INITIALIZATION ===
  private initializeComponent(): void {
    this.projectKey = this.route.snapshot.paramMap.get('projectKey') || '';
    this.mappingId = this.route.snapshot.paramMap.get('mappingId') || '';

    if (this.projectKey && this.mappingId) {
      this.loadAllData();
    }
  }

  private loadAllData(): void {
    this.loadMapping(this.projectKey, this.mappingId);
    this.loadFields(this.projectKey, this.mappingId);
    this.loadActions();
  }

  // === DATA LOADING ===
  private loadMapping(projectKey: string, mappingId: string): void {
    this.mappingsService.getMapping(projectKey, mappingId)
      .pipe(catchError(err => {
        console.error('Error loading mapping detail', err);
        return of({});
      }))
      .subscribe(mapping => {
        this.processLoadedMapping(mapping);
      });
  }

  private processLoadedMapping(mapping: any): void {
    const sortedFields = this.sortFieldsByClassification(mapping.fields ?? []);
    const processedMapping = { ...mapping, fields: sortedFields };

    this.setupProfileColumns(processedMapping);
    this.initializeMappingData(processedMapping, sortedFields);
    this.updateTreeTableConfig();
  }

  private sortFieldsByClassification(fields: any[]): any[] {
    return [...fields].sort((a, b) => {
      const classA = (a?.classification ?? '').toString();
      const classB = (b?.classification ?? '').toString();
      return classA < classB ? 1 : classA > classB ? -1 : 0;
    });
  }

  private setupProfileColumns(mapping: any): void {
    const sources = Array.isArray(mapping.sources) ? mapping.sources : [];
    const target = mapping.target ? [mapping.target] : [];
    this.profileColumns = [...sources, ...target];
  }

  private initializeMappingData(mapping: any, fields: any[]): void {
    this.totalLength = fields.length;
    this.original = mapping;
    this.mapping = mapping;
    this.filtered = { ...mapping, fields: fields.slice(0, this.pageSize) };
  }

  private loadFields(projectKey: string, mappingId: string): void {
    this.mappingsService.getMappingFields(projectKey, mappingId)
      .pipe(catchError(err => {
        console.error('Error loading fields', err);
        return of([]);
      }))
      .subscribe(fields => this.availableFields = fields.fields);
  }

  private loadActions(): void {
    this.mappingsService.getActions()
      .pipe(catchError(err => {
        console.error('Error loading actions', err);
        return of([]);
      }))
      .subscribe(data => this.classifications = data.actions);
  }

  // === SUMMARY & STATUS METHODS (delegated to helpers) ===
  getStatusSummary(): StatusSummary | null {
    return this.filtered?.fields ? SummaryHelper.calculateStatusSummary(this.filtered.fields) : null;
  }

  getTotalStatusSummary(): StatusSummary | null {
    return this.original?.fields ? SummaryHelper.calculateStatusSummary(this.original.fields) : null;
  }

  getTotalProgressPercentage(status: ProcessingStatus): number {
    const summary = this.getTotalStatusSummary();
    return summary ? SummaryHelper.getTotalProgressPercentage(summary, status) : 0;
  }

  getTotalCompletionPercentage(): number {
    const summary = this.getTotalStatusSummary();
    return summary ? SummaryHelper.getTotalCompletionPercentage(summary) : 0;
  }

  // === STATUS METHODS (delegated to helpers) ===
  getProcessingStatus(field: MappingField): ProcessingStatus {
    return StatusHelper.getProcessingStatus(field);
  }

  getStatusLabel(status: ProcessingStatus): string {
    return StatusHelper.getStatusLabel(status);
  }

  getStatusCssClass(status: ProcessingStatus): string {
    return StatusHelper.getStatusCssClass(status);
  }

  getStatusTooltip(field: MappingField, status: ProcessingStatus): string {
    return StatusHelper.getStatusTooltip(field, status);
  }

  // === CARDINALITY METHODS (delegated to helpers) ===
  formatCardinality = CardinalityHelper.formatCardinality;
  getCardinalityStyle = CardinalityHelper.getCardinalityStyle;

  // === MAPPING TEXT METHODS (delegated to helpers) ===
  getConsolidatedMappingText(field: MappingField): string {
    return MappingTextHelper.buildActionLabel(field.action_info, field.action);
  }

  getRemarkTooltip(field: MappingField): string | null {
    return MappingTextHelper.buildActionTooltip(field.action_info);
  }

  getActionSubLabel(field: MappingField): string | null {
    return MappingTextHelper.buildActionSubLabel(field.action_info);
  }

  getMappingResult(field: MappingField): string {
    return this.getConsolidatedMappingText(field);
  }

  // === EVALUATION PRESENTATION ===
  getEnhancedTooltip(field: MappingField): string {
    const lines = EvaluationHelper.buildEvaluationTooltipLines(field.evaluation);
    if (lines.length > 0) {
      return lines.join('\n');
    }

    if (field.evaluation?.summary_key) {
      return field.evaluation.summary_key;
    }

    if (field.classification) {
      return `Legacy-Status: ${field.classification}`;
    }

    return 'Keine Bewertung verfügbar.';
  }

  getEnhancedCssClass(field: MappingField): string {
    if (field.evaluation) {
      return EvaluationHelper.buildStatusClass(field.evaluation);
    }
    return LEGACY_CLASSIFICATION_CLASS[field.classification ?? ''] ?? 'status-unknown';
  }

  getEnhancedLabel(field: MappingField): string {
    if (field.evaluation) {
      return EvaluationHelper.buildStatusLabel(field.evaluation);
    }
    return field.classification ?? 'unbekannt';
  }

  // === UTILITY METHODS ===
  getDescriptionForMapping(useValue: string): string | undefined {
    return this.classifications.find(item => item.value === useValue)?.description;
  }

  getClassificationInstruction(action: string): string {
    const found = this.classifications.find((c: any) => c.value === action);
    return found ? found.description : '';
  }

  getClassificationCssClass(action: string): string {
    return ACTION_CSS[action as keyof typeof ACTION_CSS] || '';
  }

  isProfilePresent(fieldProfiles: { [key: string]: any }, profileName: string): boolean {
    return !!fieldProfiles[profileName];
  }

  getRefTooltip(field: any, profileKey: string): string {
    const fp = field.profiles?.[profileKey];
    if (!fp?.ref_types?.length) {
      return 'Keine Referenz-Typen definiert';
    }
    return `Referenz-Typen: ${fp.ref_types.join(', ')}`;
  }

  hasRefDifferences(field: any): boolean {
    const allRefs = this.profileColumns
      .map(p => field.profiles?.[p.key]?.ref_types || [])
      .filter(refs => refs.length > 0);

    if (allRefs.length <= 1) return false;

    const firstRefs = allRefs[0].sort().join(',');
    return allRefs.some(refs => refs.sort().join(',') !== firstRefs);
  }

  // === FILTER & SORT LOGIC ===
  applyQuickFilter(filterType: string): void {
    this.currentQuickFilter = filterType;
    const filteredFields = (this.original?.fields ?? []).filter((field: any) => {
      const fieldStatus = this.getProcessingStatus(field);
      return fieldStatus === filterType;
    });

    this.updateFilteredData(filteredFields);
    this.clearTextFilter();
  }

  clearQuickFilter(): void {
    this.currentQuickFilter = null;
    this.updateFilteredData(this.original?.fields ?? []);
    this.clearTextFilter();
  }

  private updateFilteredData(fields: any[]): void {
    this.mapping = { ...this.mapping, fields };
    this.totalLength = fields.length;
    this.pageIndex = 0;

    this.filtered = {
      ...this.mapping,
      fields: fields.slice(0, this.pageSize)
    };

    this.updateTreeTableConfig();
  }

  private clearTextFilter(): void {
    const filterInput = document.querySelector('input[placeholder="Filter"]') as HTMLInputElement;
    if (filterInput) {
      filterInput.value = '';
    }
  }

  handleTable = (e: any) => {
    return {
      paginator: () => this.handlePagination(e),
      sorter: () => this.handleSorting(e),
      filter: () => this.handleFiltering(e)
    };
  };

  private handlePagination(e: any): void {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.filtered = {
      ...this.mapping,
      fields: this.mapping.fields.slice(
        this.pageSize * this.pageIndex,
        this.pageSize * (this.pageIndex + 1)
      )
    };
  }

  private handleSorting(e: any): void {
    const data = [...(this.filtered?.fields ?? [])] as MappingField[];
    if (!e.active || e.direction === '') {
      this.filtered = { ...this.filtered, fields: data };
      return;
    }

    const isAsc = e.direction === 'asc';
    const sortedData = data.sort((a: MappingField, b: MappingField) => {
      switch (e.active) {
        case 'name':
          return this.compareStrings(a.name ?? '', b.name ?? '', isAsc);
        case 'compatibility':
          return this.compareStrings(a.action ?? '', b.action ?? '', isAsc);
        case 'status':
          const statusA = this.getProcessingStatus(a);
          const statusB = this.getProcessingStatus(b);
          return this.compareStrings(statusA, statusB, isAsc);
        default:
          if (e.active.startsWith('profile-')) {
            const profileKey = e.active.replace('profile-', '');
            return this.compareProfiles(a, b, profileKey, isAsc);
          }
          return 0;
      }
    });

    this.filtered = { ...this.filtered, fields: sortedData };
  }

  private compareStrings(a: string, b: string, isAsc: boolean): number {
    return (a < b ? -1 : a > b ? 1 : 0) * (isAsc ? 1 : -1);
  }

  private compareProfiles(a: MappingField, b: MappingField, profileKey: string, isAsc: boolean): number {
    const profileA = a.profiles?.[profileKey];
    const profileB = b.profiles?.[profileKey];

    if (!profileA && !profileB) return 0;
    if (!profileA) return isAsc ? -1 : 1;
    if (!profileB) return isAsc ? 1 : -1;

    const minA = Number(profileA.min ?? 0);
    const maxA = profileA.max === '*' ? 999 : Number(profileA.max ?? 0);
    const cardA = [minA, maxA];

    const minB = Number(profileB.min ?? 0);
    const maxB = profileB.max === '*' ? 999 : Number(profileB.max ?? 0);
    const cardB = [minB, maxB];

    return this.tupleCompare(cardA, cardB, isAsc);
  }

  private tupleCompare(A: Array<number>, B: Array<number>, isAsc: boolean): number {
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      const a = A[i] ?? 0;
      const b = B[i] ?? 0;
      if (a < b) return isAsc ? -1 : 1;
      if (a > b) return isAsc ? 1 : -1;
    }
    return 0;
  }

  private handleFiltering(e: any): void {
    if (this.currentQuickFilter) return;

    const raw = (e?.target as HTMLInputElement)?.value ?? '';
    const val = normalizeString(raw);

    if (!val) {
      this.updateFilteredData(this.original?.fields ?? []);
      return;
    }

    const filteredFields = (this.original?.fields ?? []).filter((record: IProfile) => {
      const name = normalizeString(record.name);
      const classification = normalizeString(record.action);
      const remark = normalizeString(record.remark);

      return name.includes(val) || classification.includes(val) || remark.includes(val);
    });

    this.updateFilteredData(filteredFields);
  }

  // === EDITING & DIALOG METHODS ===
  handleEdit = (idx?: number) => ({
    startHover: () => {
      if (this.editingIndex === null) {
        this.hoverIndex = idx ?? null;
      }
    },
    stopHover: () => {
      this.hoverIndex = null;
    },
    startEdit: () => {
      this.editingIndex = idx ?? null;
    },
    cancelEdit: () => {
      this.editingIndex = null;
    }
  });

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

  confirmChanges(field: any): void {
    let action: string = field.action;
    const updateData: any = {};

    switch (field.action) {
      case 'copy_from':
      case 'copy_to':
        updateData.targetField = field.targetField;
        break;
      case 'fixed':
        updateData.fixedValue = field.fixedValue;
        break;
    }

    this.mappingsService.updateMappingField(this.projectKey, this.mapping.id, field.name, action, updateData)
      .subscribe({
        next: () => this.loadMapping(this.projectKey, this.mapping.id),
        error: (err) => console.error('Failed to update field', err)
      });

    this.editingIndex = null;
  }

  private updateFieldAction(fieldName: string, updateRequest: MappingFieldUpdateRequest): void {
    this.mappingsService.updateMappingFieldAction(this.projectKey, this.mappingId, fieldName, updateRequest)
      .pipe(catchError(error => {
        console.error('Error updating field action:', error);
        this.snackBar.open('Fehler beim Speichern der Mapping-Action', 'Schließen', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        return of(null);
      }))
      .subscribe(response => {
        if (response) {
          this.snackBar.open('Mapping-Action erfolgreich gespeichert', 'Schließen', { duration: 3000 });
          this.loadMapping(this.projectKey, this.mappingId);
        }
      });
  }

  // === FILE & TREE OPERATIONS ===
  getStaticMappings(): void {
    const filenameBase = this.sanitizeFilename(this.filtered.name);
    const filename = `${filenameBase}.html`;

    this.mappingsService.getStaticMapping(this.projectKey, this.mappingId, true, true)
      .pipe(catchError(err => {
        console.error('Error loading static mappings', err);
        return of(new Blob());
      }))
      .subscribe(data => this.saveFile(data, filename));
  }

  private saveFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  updateTreeTableConfig(): void {
    this.treeTableConfig = {
      profileColumns: this.profileColumns
    };
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'flat' ? 'tree' : 'flat';
    this.clearQuickFilter();
  }

  // === DEBUG UTILITIES ===
  private dbg(...args: any[]): void {
    if (this.DEBUG) console.log('[MappingDetail]', ...args);
  }

  private dbgTable(label: string, rows: any[]): void {
    if (this.DEBUG && console.table) {
      console.log(`[MappingDetail] ${label}`);
      console.table(rows);
    }
  }
}
