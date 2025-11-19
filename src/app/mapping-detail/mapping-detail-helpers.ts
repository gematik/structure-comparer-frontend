// Helper utilities for mapping detail component

import { MappingEvaluation } from '../models/mapping-evaluation.model';

// Status configuration
export const STATUS_CONFIG = {
  completed: { label: 'Kompatibel', cssClass: 'status-completed' },
  resolved: { label: 'Gelöst', cssClass: 'status-resolved' },
  needs_action: { label: 'Aktion erforderlich', cssClass: 'status-needs-action' }
} as const;

// Classification CSS mapping
export const CLASSIFICATION_CSS = {
  compatible: 'compatible',
  warning: 'warning',
  incompatible: 'incompatible'
} as const;

// Action CSS mapping
export const ACTION_CSS = {
  use: 'row-use',
  not_use: 'row-not-use',
  empty: 'row-empty',
  extension: 'row-extension',
  manual: 'row-manual',
  other: 'row-other',
  copy_from: 'row-copy-from',
  copy_to: 'row-copy-to',
  fixed: 'row-fixed',
  medication_service: 'row-medication-service'
} as const;

// Cardinality utilities
export class CardinalityHelper {
  private static clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
  }

  static formatCardinality(minVal: any, maxVal: any): string {
    const min = Number.isFinite(+minVal) ? +minVal : 0;
    const max = (maxVal === '*' || maxVal === '∞') ? '*' : (Number.isFinite(+maxVal) ? +maxVal : 0);
    return `${min} .. ${max}`;
  }

  static getCardinalityStyle(minVal: any, maxVal: any): { [k: string]: string } {
    const min = Number.isFinite(+minVal) ? +minVal : 0;
    const maxIsStar = (maxVal === '*' || maxVal === '∞');
    const maxNum = maxIsStar ? 10 : (Number.isFinite(+maxVal) ? +maxVal : 0);

    const minN = 1 - (CardinalityHelper.clamp(min, 0, 2) / 2);
    const maxN = (CardinalityHelper.clamp(maxNum, 0, 10) / 10);
    const openness = CardinalityHelper.clamp(0.5 * minN + 0.5 * maxN, 0, 1);
    const hue = Math.round(0 + openness * 130);

    return {
      backgroundColor: `hsl(${hue}, 90%, 92%)`,
      color: `hsl(${hue}, 60%, 25%)`,
      borderColor: `hsl(${hue}, 65%, 45%)`
    };
  }
}

// Status calculation logic
export class StatusHelper {
  static getProcessingStatus(field: any, evaluation?: MappingEvaluation): string {
    const fieldEvaluation = evaluation?.field_evaluations?.[field.name];

    // Priority 1: Use backend processing_status if available
    if (fieldEvaluation?.processing_status) {
      return fieldEvaluation.processing_status;
    }

    // Priority 2: Use enhanced evaluation logic if available
    if (fieldEvaluation) {
      const { original_classification, action } = fieldEvaluation;

      if (original_classification === 'compatible' || original_classification === 'warning') {
        return 'completed';
      } else if (original_classification === 'incompatible' && action !== 'use') {
        return 'resolved';
      } else if (original_classification === 'incompatible' && action === 'use') {
        return 'needs_action';
      }
    }

    // Priority 3: Fallback logic for backward compatibility
    switch (field.classification) {
      case 'compatible':
      case 'warning':
        return field.action && field.action !== 'use' ? 'resolved' : 'completed';
      case 'incompatible':
        return field.action && field.action !== 'use' ? 'resolved' : 'needs_action';
      default:
        return 'needs_action';
    }
  }

  static getStatusLabel(status: string): string {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status;
  }

  static getStatusCssClass(status: string): string {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.cssClass || 'status-needs-action';
  }

  static getStatusTooltip(field: any, status: string, evaluation?: MappingEvaluation): string {
    const tooltips = {
      completed: 'Feld ist kompatibel und benötigt keine weiteren Aktionen',
      resolved: 'Ursprünglich inkompatibel, aber durch Mapping-Aktion gelöst',
      needs_action: 'Feld benötigt eine Mapping-Aktion'
    };
    return tooltips[status as keyof typeof tooltips] || 'Status unbekannt';
  }
}

// Mapping text generation
export class MappingTextHelper {
  static getConsolidatedMappingText(field: any): string {
    // If show_mapping_content is explicitly false, return empty string
    // This allows only recommendations to be displayed for needs_action fields
    if (field.show_mapping_content === false) {
      return '';
    }

    const parts: string[] = [];

    switch (field.action) {
      case 'copy_from':
        if (field.targetField) {
          parts.push(`Aus "${field.targetField}" kopieren`);
        }
        break;
      case 'copy_to':
        if (field.targetField) {
          parts.push(`In "${field.targetField}" kopieren`);
        }
        break;
      case 'fixed':
        if (field.fixedValue) {
          parts.push(`Fixer Wert: "${field.fixedValue}"`);
        }
        break;
      case 'manual':
        parts.push('Manuelle Anpassung erforderlich');
        if (field.remark) {
          parts.push(`Hinweis: ${field.remark}`);
        }
        break;
      case 'extension':
        parts.push('Als Extension verwenden');
        if (field.remark) {
          parts.push(`Details: ${field.remark}`);
        }
        break;
      case 'not_use':
        parts.push('Nicht verwenden');
        break;
      case 'empty':
        parts.push('Leer lassen');
        break;
      case 'use':
        parts.push('Direkt verwenden');
        break;
      case 'other':
        parts.push('Andere Behandlung');
        break;
      case 'medication_service':
        parts.push('Medication Service');
        break;
    }

    return parts.join(' • ');
  }

  static getRemarkTooltip(field: any): string {
    const tooltips = {
      use: 'Feld wird direkt ohne Änderungen übernommen',
      not_use: 'Feld wird im Zielprofil nicht verwendet',
      manual: 'Manuelle Implementierung erforderlich - siehe Dokumentation',
      copy_from: field.targetField ? `Wert wird aus ${field.targetField} übernommen` : 'Wert wird aus anderem Feld übernommen',
      copy_to: field.targetField ? `Wert wird in ${field.targetField} geschrieben` : 'Wert wird in anderes Feld geschrieben',
      fixed: field.fixedValue ? `Fixer Wert: ${field.fixedValue}` : 'Feld erhält einen festen Wert'
    };
    return tooltips[field.action as keyof typeof tooltips] || 'No additional information';
  }
}

// Summary calculation utilities
export class SummaryHelper {
  static calculateStatusSummary(fields: any[], evaluation?: MappingEvaluation): any {
    if (evaluation?.summary) {
      const { summary } = evaluation;
      let simplified_compatible = 0;
      let simplified_resolved = 0;
      let simplified_needs_action = 0;

      if (evaluation.field_evaluations) {
        Object.values(evaluation.field_evaluations).forEach((fieldEval: any) => {
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

      return {
        total: summary.total_fields,
        completed: simplified_compatible,
        resolved: simplified_resolved,
        needs_action: simplified_needs_action
      };
    }

    // Fallback calculation
    const summary = { total: fields.length, completed: 0, resolved: 0, needs_action: 0 };
    fields.forEach((field: any) => {
      const status = StatusHelper.getProcessingStatus(field, evaluation);
      if (summary.hasOwnProperty(status)) {
        (summary as any)[status]++;
      }
    });

    return summary;
  }

  static getTotalProgressPercentage(summary: any, status: string): number {
    if (!summary || summary.total === 0) return 0;
    const value = summary[status] || 0;
    return (value / summary.total) * 100;
  }

  static getTotalCompletionPercentage(summary: any): number {
    if (!summary || summary.total === 0) return 0;
    const completed = summary.completed + summary.resolved;
    return Math.round((completed / summary.total) * 100);
  }
}

// Enhanced evaluation utilities
export class EvaluationHelper {
  static getEnhancedTooltip(field: any, evaluation: MappingEvaluation | null, fallbackFn: (field: any) => string): string {
    const fieldEvaluation = evaluation?.field_evaluations[field.name];
    return fieldEvaluation ?
      `Enhanced: ${fieldEvaluation.enhanced_classification}` :
      fallbackFn(field);
  }

  static getEnhancedCssClass(field: any, evaluation: MappingEvaluation | null, fallbackFn: (classification: string) => string): string {
    const fieldEvaluation = evaluation?.field_evaluations[field.name];
    return fieldEvaluation ?
      fieldEvaluation.enhanced_classification :
      fallbackFn(field.classification);
  }
}

// Utility functions
export function normalizeString(value: unknown): string {
  return (value ?? '').toString().trim().toLowerCase();
}

export function compare(a: number | string, b: number | string, isAsc: boolean): number {
  const A = (a ?? '') as any;
  const B = (b ?? '') as any;
  return (A < B ? -1 : A > B ? 1 : 0) * (isAsc ? 1 : -1);
}

export function tupleCompare(A: Array<number>, B: Array<number>, isAsc: boolean): number {
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const a = A[i] ?? 0;
    const b = B[i] ?? 0;
    if (a < b) return isAsc ? -1 : 1;
    if (a > b) return isAsc ? 1 : -1;
  }
  return 0;
}
