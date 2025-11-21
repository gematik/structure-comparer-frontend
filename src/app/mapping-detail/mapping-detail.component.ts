import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
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
import { EditMappingDialogComponent, EditMappingDialogData, EditMappingDialogResult } from '../edit-mapping-dialog/edit-mapping-dialog.component';
import { ActionOption as ActionOptionModel, MappingAction, MappingField, MappingFieldUpdateRequest } from '../models/mapping.model';
import { TreeTableComponent, TreeTableConfig } from '../shared/tree-table/tree-table.component';
import { MappingActionDisplayComponent } from '../shared/mapping-action-display/mapping-action-display.component';
import { MappingActionStatisticsComponent } from '../shared/mapping-action-statistics/mapping-action-statistics.component';

// Imported helpers for cleaner code organization
import {
  CardinalityHelper,
  StatusHelper,
  MappingTextHelper,
  RecommendationHelper,
  SummaryHelper,
  normalizeString,
  ACTION_CSS,
  StatusSummary,
} from './mapping-detail-helpers';
import { MappingStatus } from '../models/mapping-evaluation.model';

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
    TreeTableComponent,
    MappingActionDisplayComponent,
    MappingActionStatisticsComponent
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
  currentQuickFilter: MappingStatus | null = null;
  currentActionFilter: MappingAction[] = [];
  filteredFields: MappingField[] = [];
  textFilterValue: string = '';

  // Profile columns and view settings
  profileColumns: Array<{ key: string; name: string; url?: string }> = [];
  viewMode: 'flat' | 'tree' = 'flat';
  treeTableConfig: TreeTableConfig = { profileColumns: [] };

  // Reference to the tree table component
  @ViewChild(TreeTableComponent) treeTableComponent?: TreeTableComponent;
  private savedTreeState: Record<string, boolean> | null = null;
  private savedQuickFilter: MappingStatus | null = null;
  private savedTextFilter: string = '';
  private savedPageIndex: number = 0;
  private savedPageSize: number = 200;

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

    // Restore tree expansion state if we saved it before reloading
    if (this.savedTreeState && this.viewMode === 'tree') {
      // Use setTimeout to ensure the tree table component is ready
      setTimeout(() => {
        if (this.treeTableComponent) {
          this.treeTableComponent.restoreExpansionState(this.savedTreeState!);
          this.savedTreeState = null;
        }
      }, 0);
    }

    // Restore filter state if we saved it before reloading
    if (this.savedQuickFilter !== null || this.savedTextFilter || this.savedPageIndex > 0 || this.savedPageSize !== 200) {
      setTimeout(() => {
        this.restoreFilterState();
      }, 0);
    }
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
    this.filteredFields = fields;
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
    if (!this.original?.fields) {
      return null;
    }

    // Try to use backend-provided counts first
    const backendSummary = this.extractBackendSummary(this.original);
    return SummaryHelper.calculateStatusSummary(this.original.fields, backendSummary);
  }

  getTotalStatusSummary(): StatusSummary | null {
    return this.getStatusSummary();
  }

  getFilteredStatusSummary(): StatusSummary | null {
    // For filtered views, always recalculate (backend doesn't know about filters)
    return this.filteredFields.length ? SummaryHelper.calculateStatusSummary(this.filteredFields, null) : null;
  }

  private extractBackendSummary(mapping: any): StatusSummary | null {
    // Check if backend provided pre-calculated counts
    if (mapping.total !== undefined &&
        mapping.incompatible !== undefined &&
        mapping.warning !== undefined &&
        mapping.solved !== undefined &&
        mapping.compatible !== undefined) {
      return {
        total: mapping.total,
        incompatible: mapping.incompatible,
        warning: mapping.warning,
        solved: mapping.solved,
        compatible: mapping.compatible,
      };
    }
    return null;
  }

  getFilteredFieldCount(): number {
    return this.filteredFields.length;
  }

  getTotalFieldCount(): number {
    return this.original?.fields?.length ?? 0;
  }

  isFilteredView(): boolean {
    const total = this.getTotalFieldCount();
    return total > 0 && this.filteredFields.length !== total;
  }

  getStatusPercentage(status: MappingStatus): number {
    const summary = this.getStatusSummary();
    return summary ? SummaryHelper.getStatusPercentage(summary, status) : 0;
  }

  getTotalCompletionPercentage(): number {
    const summary = this.getStatusSummary();
    return summary ? SummaryHelper.getTotalCompletionPercentage(summary) : 0;
  }

  // === STATUS METHODS (delegated to helpers) ===
  getFieldStatus(field: MappingField): MappingStatus {
    return StatusHelper.getFieldStatus(field);
  }

  getStatusLabel(status: MappingStatus): string {
    return StatusHelper.getLabelForStatus(status);
  }

  getStatusCssClass(status: MappingStatus): string {
    return StatusHelper.getClassForStatus(status);
  }

  getStatusTooltip(field: MappingField): string {
    return StatusHelper.getFieldStatusTooltip(field).join('\n');
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

  /**
   * Gets the icon for an action
   */
  getActionIcon(action: MappingAction | null): string {
    if (!action) return 'help_outline';

    const icons: { [key: string]: string } = {
      'use': 'check_circle',
      'use_recursive': 'account_tree',
      'not_use': 'cancel',
      'empty': 'remove_circle_outline',
      'copy_from': 'arrow_back',
      'copy_to': 'arrow_forward',
      'fixed': 'lock',
      'manual': 'edit'
    };
    return icons[action] || 'help_outline';
  }

  /**
   * Gets the label for an action button
   */
  getActionLabel(action: MappingAction | null): string {
    if (!action) return 'KEINE AKTION';

    const labels: { [key: string]: string } = {
      'use': 'USE',
      'use_recursive': 'USE_RECURSIVE',
      'not_use': 'NOT_USE',
      'empty': 'EMPTY',
      'copy_from': 'COPY_FROM',
      'copy_to': 'COPY_TO',
      'fixed': 'FIXED',
      'manual': 'MANUAL'
    };
    return labels[action] || action.toUpperCase();
  }

  // === EVALUATION PRESENTATION ===
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
  applyQuickFilter(filterType: MappingStatus): void {
    this.currentQuickFilter = filterType;
    this.applyAllFilters();
    this.clearTextFilter();
  }

  clearQuickFilter(): void {
    this.currentQuickFilter = null;
    this.applyAllFilters();
    this.clearTextFilter();
  }

  applyActionFilter(actions: MappingAction[]): void {
    this.currentActionFilter = actions;
    this.applyAllFilters();
    this.clearTextFilter();
  }

  private applyAllFilters(): void {
    let filteredFields = this.original?.fields ?? [];

    // Apply status filter
    if (this.currentQuickFilter) {
      filteredFields = filteredFields.filter((field: MappingField) => {
        const fieldStatus = this.getFieldStatus(field);
        return fieldStatus === this.currentQuickFilter;
      });
    }

    // Apply action filter - support multiple actions
    if (this.currentActionFilter.length > 0) {
      filteredFields = filteredFields.filter((field: MappingField) => {
        return field.action && this.currentActionFilter.includes(field.action);
      });
    }

    this.updateFilteredData(filteredFields);
  }

  private restoreFilterState(): void {
    // Restore page size first
    if (this.savedPageSize && this.savedPageSize !== this.pageSize) {
      this.pageSize = this.savedPageSize;
    }

    // Restore quick filter
    if (this.savedQuickFilter !== null) {
      this.applyQuickFilter(this.savedQuickFilter);
    }

    // Restore text filter
    if (this.savedTextFilter) {
      const filterInput = document.querySelector('input[placeholder="Filter"]') as HTMLInputElement;
      if (filterInput) {
        filterInput.value = this.savedTextFilter;
        this.textFilterValue = this.savedTextFilter;
        // Apply text filter
        this.handleFiltering({ target: filterInput });
      }
    }

    // Restore page index
    if (this.savedPageIndex > 0) {
      this.pageIndex = this.savedPageIndex;
      this.filtered = {
        ...this.mapping,
        fields: this.mapping.fields.slice(
          this.pageSize * this.pageIndex,
          this.pageSize * (this.pageIndex + 1)
        )
      };
    }

    // Clear saved state
    this.savedQuickFilter = null;
    this.savedTextFilter = '';
    this.savedPageIndex = 0;
    this.savedPageSize = 200;
  }

  private updateFilteredData(fields: any[]): void {
    const baseMapping = this.mapping ?? this.original ?? {};
    this.mapping = { ...baseMapping, fields };
    this.filteredFields = fields;
    this.totalLength = fields.length;
    this.pageIndex = 0;

    this.filtered = {
      ...this.mapping,
      fields: fields.slice(0, this.pageSize)
    };

    this.updateTreeTableConfig();
  }

  private clearTextFilter(): void {
    this.textFilterValue = '';
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
        case 'status':
          const statusA = this.getFieldStatus(a);
          const statusB = this.getFieldStatus(b);
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
    const raw = (e?.target as HTMLInputElement)?.value ?? '';
    const val = normalizeString(raw);

    // Store the filter value for tree view
    this.textFilterValue = raw;

    // Start with original fields or quick-filtered fields
    let sourceFields = this.original?.fields ?? [];

    // Apply quick filter first if active
    if (this.currentQuickFilter) {
      sourceFields = sourceFields.filter((field: MappingField) => {
        const fieldStatus = this.getFieldStatus(field);
        return fieldStatus === this.currentQuickFilter;
      });
    }

    // If no text filter, use the source fields (original or quick-filtered)
    if (!val) {
      this.updateFilteredData(sourceFields);
      return;
    }

    // Apply text filter on top of quick filter
    const filteredFields = sourceFields.filter((record: IProfile & MappingField) => {
      const name = normalizeString(record.name);
      const classification = normalizeString(record.action);
      const remark = normalizeString(record.remark);
      const status = normalizeString(this.getStatusLabel(this.getFieldStatus(record as MappingField)));

      return name.includes(val) || classification.includes(val) || remark.includes(val) || status.includes(val);
    });

    this.updateFilteredData(filteredFields);
  }

  onTextFilterChanged(filterText: string): void {
    this.textFilterValue = filterText;
    const event = { target: { value: filterText } };
    this.handleFiltering(event);
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
    // Save current filter state before opening dialog
    this.savedQuickFilter = this.currentQuickFilter;
    this.savedTextFilter = this.textFilterValue;
    this.savedPageIndex = this.pageIndex;
    this.savedPageSize = this.pageSize;

    const dialogData: EditPropertyActionDialogData = {
      field: field,
      availableActions: this.classifications,
      availableFields: this.availableFields,
      projectKey: this.projectKey,
      mappingId: this.mappingId,
      sources: this.filtered.sources,
      target: this.filtered.target
    };

    const dialogRef = this.dialog.open(EditPropertyActionDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: dialogData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: MappingFieldUpdateRequest) => {
      if (result) {
        this.updateFieldAction(field.name, result);
      }
    });
  }

  openEditMappingDialog(): void {
    const dialogData: EditMappingDialogData = {
      name: this.filtered.name,
      status: this.filtered.status,
      version: this.filtered.version,
      sources: this.filtered.sources.map((source: any) => ({
        name: source.name,
        url: source.url || null,
        version: source.version,
        webUrl: source.webUrl || null,
        package: source.package || null
      })),
      target: {
        name: this.filtered.target.name,
        url: this.filtered.target.url || null,
        version: this.filtered.target.version,
        webUrl: this.filtered.target.webUrl || null,
        package: this.filtered.target.package || null
      }
    };

    const dialogRef = this.dialog.open(EditMappingDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: EditMappingDialogResult) => {
      if (result) {
        this.updateMappingMetadata(result);
      }
    });
  }

  private updateMappingMetadata(updateData: EditMappingDialogResult): void {
    this.mappingsService.updateMappingMetadata(this.projectKey, this.mappingId, updateData)
      .pipe(catchError(error => {
        console.error('Error updating mapping metadata:', error);
        this.snackBar.open('Fehler beim Speichern der Mapping-Eigenschaften', 'Schließen', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        return of(null);
      }))
      .subscribe(response => {
        if (response) {
          this.snackBar.open('Mapping-Eigenschaften erfolgreich gespeichert', 'Schließen', { duration: 3000 });
          this.loadMapping(this.projectKey, this.mappingId);
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
    // Save tree expansion state before reloading
    if (this.viewMode === 'tree' && this.treeTableComponent) {
      this.savedTreeState = this.treeTableComponent.saveExpansionState();
    }

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

  // === RECOMMENDATION METHODS ===
  /**
   * Check if field has a recommendation
   */
  hasRecommendation(field: MappingField): boolean {
    return RecommendationHelper.hasRecommendation(field);
  }

  /**
   * Get the number of recommendations for a field
   */
  getRecommendationCount(field: MappingField): number {
    return RecommendationHelper.getRecommendations(field).length;
  }

  /**
   * Get all recommendations for a field
   */
  getRecommendations(field: MappingField): any[] {
    return RecommendationHelper.getRecommendations(field);
  }

  /**
   * Get label for the first recommendation
   */
  getRecommendationLabel(field: MappingField): string {
    const recommendation = RecommendationHelper.getFirstRecommendation(field);
    if (!recommendation) {
      return '';
    }
    return RecommendationHelper.buildRecommendationLabel(recommendation);
  }

  /**
   * Get tooltip for the first recommendation
   */
  getRecommendationTooltip(field: MappingField): string {
    const recommendation = RecommendationHelper.getFirstRecommendation(field);
    if (!recommendation) {
      return '';
    }
    return RecommendationHelper.buildRecommendationTooltip(recommendation);
  }

  /**
   * Get recommendation action type for CSS class binding (first recommendation)
   */
  getRecommendationAction(field: MappingField): string | null {
    const recommendation = RecommendationHelper.getFirstRecommendation(field);
    if (!recommendation) {
      return null;
    }
    return RecommendationHelper.getRecommendationAction(recommendation);
  }

  /**
   * Apply a recommendation to convert it into an active action
   * @param field The field with the recommendation
   * @param index The index of the recommendation to apply (default: 0)
   * @param event Optional event to prevent bubbling
   */
  applyRecommendation(field: MappingField, indexOrEvent?: number | Event, event?: Event): void {
    // Handle flexible parameters: (field, event) or (field, index, event)
    let index = 0;
    let actualEvent: Event | undefined;

    if (typeof indexOrEvent === 'number') {
      index = indexOrEvent;
      actualEvent = event;
    } else {
      actualEvent = indexOrEvent;
    }

    // Prevent event bubbling to parent click handlers
    if (actualEvent) {
      actualEvent.stopPropagation();
      actualEvent.preventDefault();
    }

    // Validate that the field has recommendations
    const recommendations = RecommendationHelper.getRecommendations(field);
    if (recommendations.length === 0) {
      this.snackBar.open('Keine Empfehlung vorhanden', 'Schließen', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Validate index
    if (index < 0 || index >= recommendations.length) {
      this.snackBar.open(`Ungültiger Index ${index}. Feld hat ${recommendations.length} Empfehlung(en).`, 'Schließen', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Save tree expansion state before reloading
    if (this.viewMode === 'tree' && this.treeTableComponent) {
      this.savedTreeState = this.treeTableComponent.saveExpansionState();
    }

    // Save filter state
    this.savedQuickFilter = this.currentQuickFilter;
    this.savedTextFilter = this.textFilterValue;
    this.savedPageIndex = this.pageIndex;
    this.savedPageSize = this.pageSize;

    this.mappingsService.applyRecommendation(this.projectKey, this.mappingId, field.name, index)
      .pipe(catchError(error => {
        console.error('Error applying recommendation:', error);
        this.snackBar.open('Fehler beim Anwenden der Empfehlung', 'Schließen', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        return of(null);
      }))
      .subscribe(response => {
        if (response) {
          this.snackBar.open('Empfehlung erfolgreich angewendet', 'Schließen', { duration: 3000 });
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

  downloadStructureMap(): void {
    const filenameBase = this.sanitizeFilename(this.filtered?.name || this.mappingId);
    const filename = `${filenameBase}_structuremap.json`;

    this.mappingsService.downloadStructureMap(this.projectKey, this.mappingId)
      .pipe(catchError(err => {
        console.error('Error downloading StructureMap export', err);
        this.snackBar.open('Fehler beim Herunterladen der StructureMap-Datei', 'Schließen', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        return of(new Blob());
      }))
      .subscribe(data => {
        if (data.size > 0) {
          this.saveFile(data, filename);
          this.snackBar.open('StructureMap-Datei erfolgreich heruntergeladen', 'Schließen', { duration: 3000 });
        }
      });
  }  private saveFile(blob: Blob, filename: string): void {
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
