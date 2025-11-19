// Helper utilities for mapping detail component aligned with ActionInfo & EvaluationResult

import { MappingField } from '../models/mapping.model';
import {
  ActionInfo,
  ActionType,
  EvaluationReason,
  EvaluationResult,
  EvaluationStatus,
} from '../models/mapping-evaluation.model';

export type ProcessingStatus = 'completed' | 'resolved' | 'needs_action';

export const STATUS_CONFIG: Record<ProcessingStatus, { label: string; cssClass: string }> = {
  completed: { label: 'Kompatibel', cssClass: 'status-completed' },
  resolved: { label: 'Gelöst', cssClass: 'status-resolved' },
  needs_action: { label: 'Aktion erforderlich', cssClass: 'status-needs-action' },
};

export const CLASSIFICATION_CSS = {
  compatible: 'compatible',
  warning: 'warning',
  incompatible: 'incompatible',
} as const;

export const ACTION_CSS: Record<string, string> = {
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

export interface StatusSummary {
  total: number;
  completed: number;
  resolved: number;
  needs_action: number;
}

// Cardinality utilities
export class CardinalityHelper {
  private static clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
  }

  static formatCardinality(minVal: unknown, maxVal: unknown): string {
    const minNum = Number(minVal);
    const min = Number.isFinite(minNum) ? minNum : 0;
    if (maxVal === '*' || maxVal === '∞') {
      return `${min} .. *`;
    }
    const maxNum = Number(maxVal);
    const max = Number.isFinite(maxNum) ? maxNum : 0;
    return `${min} .. ${max}`;
  }

  static getCardinalityStyle(minVal: unknown, maxVal: unknown): Record<string, string> {
    const minNum = Number(minVal);
    const min = Number.isFinite(minNum) ? minNum : 0;
    const maxIsStar = maxVal === '*' || maxVal === '∞';
    const rawMaxNum = Number(maxVal);
    const maxNum = maxIsStar ? 10 : Number.isFinite(rawMaxNum) ? rawMaxNum : 0;

    const minN = 1 - CardinalityHelper.clamp(min, 0, 2) / 2;
    const maxN = CardinalityHelper.clamp(maxNum, 0, 10) / 10;
    const openness = CardinalityHelper.clamp(0.5 * minN + 0.5 * maxN, 0, 1);
    const hue = Math.round(openness * 130);

    return {
      backgroundColor: `hsl(${hue}, 90%, 92%)`,
      color: `hsl(${hue}, 60%, 25%)`,
      borderColor: `hsl(${hue}, 65%, 45%)`,
    };
  }
}

const ACTION_LABELS: Record<ActionType, string> = {
  use: 'Wird verwendet',
  not_use: 'Wird nicht verwendet',
  empty: 'Bleibt leer',
  extension: 'Als Extension verwenden',
  copy_from: 'Aus anderem Feld kopieren',
  copy_to: 'In anderes Feld kopieren',
  fixed: 'Fester Wert',
  other: 'Andere Aktion',
};

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  ok: 'Kompatibel',
  action_required: 'Aktion erforderlich',
  resolved: 'Gelöst',
  incompatible: 'Inkompatibel',
  unknown: 'Unklar',
  evaluation_failed: 'Bewertung fehlgeschlagen',
};

const STATUS_CLASS: Record<EvaluationStatus, string> = {
  ok: 'status-ok',
  action_required: 'status-needs-action',
  resolved: 'status-resolved',
  incompatible: 'status-incompatible',
  unknown: 'status-unknown',
  evaluation_failed: 'status-evaluation-failed',
};

// Mapping text generation
export class MappingTextHelper {
  static buildActionLabel(actionInfo?: ActionInfo | null, fallback?: string): string {
    if (!actionInfo) {
      return fallback ?? 'Keine Aktion definiert';
    }

    const base = ACTION_LABELS[actionInfo.action] ?? 'Unbekannte Aktion';
    const inheritedSuffix = actionInfo.source === 'inherited' && actionInfo.inherited_from
      ? ` (vererbt von ${actionInfo.inherited_from})`
      : '';

    if (actionInfo.action === 'copy_from' || actionInfo.action === 'copy_to') {
      const target = actionInfo.other_value;
      if (typeof target === 'string' && target.trim().length > 0) {
        return `${base} (${target})${inheritedSuffix}`;
      }
    }

    if (actionInfo.action === 'fixed') {
      const fixed = MappingTextHelper.formatValue(actionInfo.fixed_value);
      if (fixed) {
        return `${base} (${fixed})${inheritedSuffix}`;
      }
    }

    return `${base}${inheritedSuffix}`;
  }

  static buildActionSubLabel(actionInfo?: ActionInfo | null): string | null {
    if (!actionInfo) {
      return null;
    }

    if (actionInfo.system_remark && actionInfo.system_remark.trim().length > 0) {
      return actionInfo.system_remark;
    }

    if (actionInfo.action === 'fixed') {
      const fixed = MappingTextHelper.formatValue(actionInfo.fixed_value);
      return fixed ? `Festwert: ${fixed}` : null;
    }

    if ((actionInfo.action === 'copy_from' || actionInfo.action === 'copy_to') && actionInfo.other_value) {
      const other = MappingTextHelper.formatValue(actionInfo.other_value);
      return other ? `Referenz: ${other}` : null;
    }

    return null;
  }

  static buildActionTooltip(actionInfo?: ActionInfo | null): string | null {
    if (!actionInfo) {
      return null;
    }

    const lines: string[] = [];

    if (actionInfo.user_remark) {
      lines.push(`Hinweis: ${actionInfo.user_remark}`);
    }

    if (actionInfo.system_remark) {
      lines.push(actionInfo.system_remark);
    }

    if (actionInfo.action === 'fixed') {
      const value = MappingTextHelper.formatValue(actionInfo.fixed_value);
      if (value) {
        lines.push(`Festwert: ${value}`);
      }
    }

    if ((actionInfo.action === 'copy_from' || actionInfo.action === 'copy_to') && actionInfo.other_value) {
      const reference = MappingTextHelper.formatValue(actionInfo.other_value);
      if (reference) {
        lines.push(`Referenz: ${reference}`);
      }
    }

    if (actionInfo.source === 'inherited' && actionInfo.inherited_from) {
      lines.push(`Vererbt von ${actionInfo.inherited_from}`);
    }

    if (actionInfo.source === 'system_default') {
      lines.push('Systemstandard angewendet');
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }

  static resolveRowClass(field: MappingField): string {
    const action = field.action_info?.action ?? (field.action as string);
    return ACTION_CSS[action] ?? 'row-unknown';
  }

  private static formatValue(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value === 'string') {
      return value.trim() || null;
    }
    return JSON.stringify(value);
  }
}

// Evaluation utilities
export class EvaluationHelper {
  static buildStatusLabel(evaluation?: EvaluationResult | null): string {
    if (!evaluation) {
      return 'Keine Bewertung';
    }
    return STATUS_LABELS[evaluation.status] ?? 'Unbekannt';
  }

  static buildStatusClass(evaluation?: EvaluationResult | null): string {
    if (!evaluation) {
      return 'status-unknown';
    }
    return STATUS_CLASS[evaluation.status] ?? 'status-unknown';
  }

  static buildEvaluationTooltipLines(evaluation?: EvaluationResult | null): string[] {
    if (!evaluation) {
      return [];
    }

    if (evaluation.reasons.length === 0) {
      const lines: string[] = [];
      if (evaluation.summary_key) {
        lines.push(evaluation.summary_key);
      }
      if (evaluation.has_warnings) {
        lines.push('Warnungen liegen vor.');
      }
      if (evaluation.has_errors) {
        lines.push('Fehler erkannt.');
      }
      return lines;
    }

    return evaluation.reasons.map((reason: EvaluationReason) => {
      const severity = reason.severity.toUpperCase();
      const actionSuffix = reason.related_action ? ` (Aktion: ${reason.related_action})` : '';
      const details = Object.keys(reason.details ?? {}).length > 0
        ? ` ${JSON.stringify(reason.details)}`
        : '';
      return `[${severity}] ${reason.message_key}${details}${actionSuffix}`;
    });
  }
}

// Status calculation logic
export class StatusHelper {
  static getProcessingStatus(field: MappingField): ProcessingStatus {
    const evaluation = field.evaluation;

    if (evaluation) {
      switch (evaluation.status) {
        case 'ok':
          return 'completed';
        case 'resolved':
          return 'resolved';
        case 'action_required':
        case 'incompatible':
        case 'evaluation_failed':
          return 'needs_action';
        case 'unknown':
        default:
          if (evaluation.has_errors) {
            return 'needs_action';
          }
          if (evaluation.has_warnings) {
            return 'resolved';
          }
          return 'completed';
      }
    }

    // Fallback to legacy classification mapping if no evaluation is present.
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

  static getStatusLabel(status: ProcessingStatus): string {
    return STATUS_CONFIG[status]?.label ?? status;
  }

  static getStatusCssClass(status: ProcessingStatus): string {
    return STATUS_CONFIG[status]?.cssClass ?? 'status-needs-action';
  }

  static getStatusTooltip(field: MappingField, status: ProcessingStatus): string {
    const evaluation = field.evaluation;
    const evaluationLines = EvaluationHelper.buildEvaluationTooltipLines(evaluation);

    if (evaluationLines.length > 0) {
      return evaluationLines.join('\n');
    }

    const defaults: Record<ProcessingStatus, string> = {
      completed: 'Feld ist kompatibel und benötigt keine weiteren Aktionen.',
      resolved: 'Ursprünglich inkompatibel, aber durch Mapping-Aktion gelöst.',
      needs_action: 'Feld benötigt eine Mapping-Aktion.',
    };

    return defaults[status];
  }
}

// Summary calculation utilities
export class SummaryHelper {
  static calculateStatusSummary(fields: MappingField[]): StatusSummary {
    const summary: StatusSummary = { total: fields.length, completed: 0, resolved: 0, needs_action: 0 };

    fields.forEach((field) => {
      const status = StatusHelper.getProcessingStatus(field);
      summary[status] = summary[status] + 1;
    });

    return summary;
  }

  static getTotalProgressPercentage(summary: StatusSummary, status: ProcessingStatus): number {
    if (!summary || summary.total === 0) {
      return 0;
    }
    const value = summary[status] || 0;
    return (value / summary.total) * 100;
  }

  static getTotalCompletionPercentage(summary: StatusSummary): number {
    if (!summary || summary.total === 0) {
      return 0;
    }
    const completed = summary.completed + summary.resolved;
    return Math.round((completed / summary.total) * 100);
  }
}

// Utility functions used by component
export function normalizeString(value: unknown): string {
  return (value ?? '').toString().trim().toLowerCase();
}

export function compare(a: number | string, b: number | string, isAsc: boolean): number {
  const A = (a ?? '') as number | string;
  const B = (b ?? '') as number | string;
  return (A < B ? -1 : A > B ? 1 : 0) * (isAsc ? 1 : -1);
}

export function tupleCompare(A: number[], B: number[], isAsc: boolean): number {
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const a = A[i] ?? 0;
    const b = B[i] ?? 0;
    if (a < b) return isAsc ? -1 : 1;
    if (a > b) return isAsc ? 1 : -1;
  }
  return 0;
}
