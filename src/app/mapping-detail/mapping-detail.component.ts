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
import { MappingEvaluation, FieldEvaluation, EnhancedMappingField } from '../models/mapping-evaluation.model';
import { TreeTableComponent, TreeTableConfig } from '../shared/tree-table/tree-table.component';

// Imported helpers for cleaner code organization
import {
  CardinalityHelper,
  StatusHelper,
  MappingTextHelper,
  SummaryHelper,
  EvaluationHelper,
  normalizeString,
  CLASSIFICATION_CSS,
  ACTION_CSS
} from './mapping-detail-helpers';

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

  // Enhanced evaluation data
  mappingEvaluation: MappingEvaluation | null = null;
  enhancedFields: EnhancedMappingField[] = [];
  showEnhancedView = true;
  enhancedViewAvailable = false;
  evaluationLoadingError: string | null = null;
  showDetailedRecommendations = true;
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
    private comparisonService: ComparisonService,
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
        this.loadMappingEvaluation(projectKey, mappingId);
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

  loadMappingEvaluation(projectKey: string, mappingId: string): void {
    this.comparisonService.getMappingEvaluation(projectKey, mappingId)
      .pipe(catchError(err => {
        console.error('Error loading mapping evaluation', err);
        this.evaluationLoadingError = err.message || 'Failed to load enhanced evaluation';
        this.enhancedViewAvailable = false;
        this.createFallbackEvaluation();
        return of(null);
      }))
      .subscribe(evaluation => {
        if (evaluation) {
          this.mappingEvaluation = evaluation;
          this.enhancedViewAvailable = true;
          this.evaluationLoadingError = null;
          this.enhanceFieldsWithEvaluation();
        }
      });
  }

  enhanceFieldsWithEvaluation(): void {
    if (!this.mappingEvaluation || !this.filtered?.fields) return;

    this.enhancedFields = this.filtered.fields.map((field: any) => {
      const evaluation = this.mappingEvaluation!.field_evaluations[field.name];
      const enhancedField: EnhancedMappingField = { ...field, evaluation };

      if (evaluation) {
        enhancedField.enhancedTooltip = this.comparisonService.getEnhancedClassificationDescription(evaluation);
        enhancedField.cssClass = this.comparisonService.getEnhancedClassificationCssClass(evaluation.enhanced_classification);
      }

      return enhancedField;
    });
  }

  createFallbackEvaluation(): void {
    if (!this.filtered?.fields) return;

    const fieldEvaluations: any = {};
    this.filtered.fields.forEach((field: any) => {
      let enhancedClassification = 'compatible';
      let issues: any[] = [];
      let warnings: string[] = [];
      let recommendations: string[] = [];

      switch (field.classification) {
        case 'incompatible':
          enhancedClassification = 'incompatible';
          issues.push({ message: 'Field is incompatible', severity: 'error', requires_attention: true });
          break;
        case 'warning':
          enhancedClassification = 'warning';
          warnings.push('Field may have compatibility issues');
          break;
      }

      if (field.action === 'manual') {
        enhancedClassification = 'action_mitigated';
        recommendations.push('Ensure manual implementation is properly documented');
      }

      fieldEvaluations[field.name] = {
        field_name: field.name,
        original_classification: field.classification,
        enhanced_classification: enhancedClassification,
        action: field.action,
        issues, warnings, recommendations
      };
    });

    this.mappingEvaluation = {
      mapping_id: this.mappingId,
      mapping_name: this.filtered.name,
      field_evaluations: fieldEvaluations,
      summary: {
        total_fields: this.filtered.fields.length,
        compatible: Object.values(fieldEvaluations).filter((e: any) => e.enhanced_classification === 'compatible').length,
        warnings: Object.values(fieldEvaluations).filter((e: any) => e.enhanced_classification === 'warning').length,
        incompatible: Object.values(fieldEvaluations).filter((e: any) => e.enhanced_classification === 'incompatible').length,
        action_resolved: Object.values(fieldEvaluations).filter((e: any) => e.enhanced_classification === 'action_resolved').length,
        action_mitigated: Object.values(fieldEvaluations).filter((e: any) => e.enhanced_classification === 'action_mitigated').length,
        needs_attention: Object.values(fieldEvaluations).filter((e: any) => e.issues?.some((i: any) => i.requires_attention)).length
      }
    };

    this.enhancedViewAvailable = true;
    this.enhanceFieldsWithEvaluation();
  }

  // === SUMMARY & STATUS METHODS (delegated to helpers) ===
  getEvaluationSummary(): any {
    const summary = this.mappingEvaluation?.summary;
    if (!summary) return null;

    let simplified_compatible = 0;
    let simplified_resolved = 0;
    let simplified_needs_action = 0;

    if (this.mappingEvaluation?.field_evaluations) {
      Object.values(this.mappingEvaluation.field_evaluations).forEach((fieldEval: any) => {
        const { original_classification, action } = fieldEval;

        if (original_classification === 'compatible' || original_classification === 'warning') {
          simplified_compatible++;
        } else if (original_classification === 'incompatible' && action !== 'use') {
          simplified_resolved++;
        } else if (original_classification === 'incompatible' && action === 'use') {
          simplified_needs_action++;
        }
      });
    }

    return { ...summary, simplified_compatible, simplified_resolved, simplified_needs_action };
  }

  getStatusSummary(): any {
    const evalSummary = this.getEvaluationSummary();
    if (evalSummary) {
      return {
        total: evalSummary.total_fields,
        completed: evalSummary.simplified_compatible || 0,
        resolved: evalSummary.simplified_resolved || 0,
        needs_action: evalSummary.simplified_needs_action || 0
      };
    }

    return this.filtered?.fields ?
      SummaryHelper.calculateStatusSummary(this.filtered.fields, this.mappingEvaluation ?? undefined) :
      null;
  }

  getTotalStatusSummary(): any {
    return this.original?.fields ?
      SummaryHelper.calculateStatusSummary(this.original.fields, this.mappingEvaluation ?? undefined) :
      null;
  }

  getTotalProgressPercentage(status: string): number {
    const summary = this.getTotalStatusSummary();
    return SummaryHelper.getTotalProgressPercentage(summary, status);
  }

  getTotalCompletionPercentage(): number {
    const summary = this.getTotalStatusSummary();
    return SummaryHelper.getTotalCompletionPercentage(summary);
  }

  // === STATUS METHODS (delegated to helpers) ===
  loadComparisonCSSProperty(compatibility: string): string {
    return CLASSIFICATION_CSS[compatibility as keyof typeof CLASSIFICATION_CSS] || '';
  }

  getProcessingStatus(field: any): string {
    return StatusHelper.getProcessingStatus(field, this.mappingEvaluation ?? undefined);
  }

  getStatusLabel(status: string): string {
    return StatusHelper.getStatusLabel(status);
  }

  getStatusCssClass(status: string): string {
    return StatusHelper.getStatusCssClass(status);
  }

  getStatusTooltip(field: any, status: string): string {
    return StatusHelper.getStatusTooltip(field, status, this.mappingEvaluation ?? undefined);
  }

  // === CARDINALITY METHODS (delegated to helpers) ===
  formatCardinality = CardinalityHelper.formatCardinality;
  getCardinalityStyle = CardinalityHelper.getCardinalityStyle;

  // === MAPPING TEXT METHODS (delegated to helpers) ===
  getRemarkTooltip = MappingTextHelper.getRemarkTooltip;
  getConsolidatedMappingText = MappingTextHelper.getConsolidatedMappingText;

  getMappingResult(field: any): string {
    return this.getConsolidatedMappingText(field);
  }

  // === ENHANCED EVALUATION METHODS (delegated to helpers) ===
  getEnhancedTooltip(field: any): string {
    return EvaluationHelper.getEnhancedTooltip(field, this.mappingEvaluation, this.getTooltipComparison.bind(this));
  }

  getEnhancedCssClass(field: any): string {
    return EvaluationHelper.getEnhancedCssClass(field, this.mappingEvaluation, this.loadComparisonCSSProperty.bind(this));
  }

  // === UTILITY METHODS ===
  getDescriptionForMapping(useValue: string): string | undefined {
    return this.classifications.find(item => item.value === useValue)?.description;
  }

  getTooltipComparison(field: any): string {
    return this.comparisonService.getClassificationDescription(field);
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
    const data = [...(this.filtered?.fields ?? [])];
    if (!e.active || e.direction === '') {
      this.filtered = { ...this.filtered, fields: data };
      return;
    }

    const isAsc = e.direction === 'asc';
    const sortedData = data.sort((a: IProfile, b: IProfile) => {
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

  private compareProfiles(a: any, b: any, profileKey: string, isAsc: boolean): number {
    const profileA = a.profiles?.[profileKey];
    const profileB = b.profiles?.[profileKey];

    if (!profileA && !profileB) return 0;
    if (!profileA) return isAsc ? -1 : 1;
    if (!profileB) return isAsc ? 1 : -1;

    const cardA = [profileA.min ?? 0, profileA.max === '*' ? 999 : (profileA.max ?? 0)];
    const cardB = [profileB.min ?? 0, profileB.max === '*' ? 999 : (profileB.max ?? 0)];

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
