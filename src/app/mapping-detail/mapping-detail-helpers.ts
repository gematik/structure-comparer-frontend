// Helper utilities for mapping detail component aligned with ActionInfo & EvaluationResult

import { MappingField } from '../models/mapping.model';
import {
  ActionInfo,
  ActionType,
  EvaluationReason,
  EvaluationResult,
  MappingStatus,
} from '../models/mapping-evaluation.model';

export type StatusSummary = Record<MappingStatus, number> & {
  total: number;
};

const STATUS_META: Record<MappingStatus, { label: string; cssClass: string; defaultTooltip: string }> = {
  incompatible: {
    label: 'Inkompatibel',
    cssClass: 'status-incompatible',
    defaultTooltip: 'Aktion erforderlich, Feld ist aktuell inkompatibel.',
  },
  warning: {
    label: 'Warnung',
    cssClass: 'status-warning',
    defaultTooltip: 'Überprüfung empfohlen, mögliche Abweichungen erkannt.',
  },
  solved: {
    label: 'Gelöst',
    cssClass: 'status-solved',
    defaultTooltip: 'Konflikt wurde durch eine manuelle Aktion gelöst.',
  },
  compatible: {
    label: 'Kompatibel',
    cssClass: 'status-compatible',
    defaultTooltip: 'Feld ist kompatibel, keine Aktion erforderlich.',
  },
};

export const ACTION_CSS: Record<string, string> = {
  use: 'row-use',
  not_use: 'row-not-use',
  empty: 'row-empty',
  manual: 'row-manual',
  copy_from: 'row-copy-from',
  copy_to: 'row-copy-to',
  fixed: 'row-fixed',
  // Special styling for fields with no action selected
  'no-action': 'row-no-action',
};

const FALLBACK_STATUS: MappingStatus = 'incompatible';

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
  use_recursive: 'Wird verwendet (inkl. Kindelemente)',
  not_use: 'Wird nicht verwendet',
  empty: 'Bleibt leer',
  copy_from: 'Aus anderem Feld kopieren',
  copy_to: 'In anderes Feld kopieren',
  fixed: 'Fester Wert',
  manual: 'Manuelle Anweisung',
  // Note: 'manual' action means user has provided free-text implementation instructions in remark field
  // null action means no action selected yet - user must decide
};

// Mapping text generation
export class MappingTextHelper {
  static buildActionLabel(actionInfo?: ActionInfo | null, fallback?: string | null): string {
    if (!actionInfo) {
      return fallback ?? 'Keine Aktion definiert';
    }

    // No action selected yet - user must decide
    if (actionInfo.action === null || actionInfo.action === undefined) {
      return 'Aktion erforderlich';
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

    // No action selected yet - provide clear instruction
    if (actionInfo.action === null || actionInfo.action === undefined) {
      return 'Bitte Mapping-Aktion wählen, um das Problem zu lösen';
    }

    // Priorität 1: user_remark (aus manual_entries.yaml)
    if (actionInfo.user_remark && actionInfo.user_remark.trim().length > 0) {
      return actionInfo.user_remark;
    }

    // Priorität 2: system_remark
    if (actionInfo.system_remark && actionInfo.system_remark.trim().length > 0) {
      return actionInfo.system_remark;
    }

    // Priorität 3: Automatisch generierte Informationen
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

    // Handle null action (no action selected yet)
    if (action === null || action === undefined) {
      return ACTION_CSS['no-action'] ?? 'row-no-action';
    }

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
  static getStatusFromEvaluation(evaluation?: EvaluationResult | null): MappingStatus | null {
    return evaluation?.mapping_status ?? null;
  }

  static getFallbackStatus(field: MappingField): MappingStatus {
    const classification = (field.classification ?? '').toLowerCase();

    if (classification === 'incompatible') {
      return 'incompatible';
    }
    if (classification === 'warning') {
      return 'warning';
    }

    // Heuristic: if a manual action is present without evaluation, treat as solved.
    const source = field.action_info?.source;
    if (source === 'manual') {
      return 'solved';
    }

    return 'compatible';
  }

  static getFieldStatus(field: MappingField): MappingStatus {
    return this.getStatusFromEvaluation(field.evaluation) ?? this.getFallbackStatus(field);
  }

  static getLabelForStatus(status: MappingStatus): string {
    return STATUS_META[status]?.label ?? STATUS_META[FALLBACK_STATUS].label;
  }

  static getClassForStatus(status: MappingStatus): string {
    return STATUS_META[status]?.cssClass ?? STATUS_META[FALLBACK_STATUS].cssClass;
  }

  static getDefaultTooltip(status: MappingStatus): string {
    return STATUS_META[status]?.defaultTooltip ?? STATUS_META[FALLBACK_STATUS].defaultTooltip;
  }

  static getFieldStatusLabel(field: MappingField): string {
    return this.getLabelForStatus(this.getFieldStatus(field));
  }

  static getFieldStatusClass(field: MappingField): string {
    return this.getClassForStatus(this.getFieldStatus(field));
  }

  static getFieldStatusTooltip(field: MappingField): string[] {
    const evaluationLines = EvaluationHelper.buildEvaluationTooltipLines(field.evaluation);
    if (evaluationLines.length > 0) {
      return evaluationLines;
    }
    return [this.getDefaultTooltip(this.getFieldStatus(field))];
  }
}

// Summary calculation utilities
export class SummaryHelper {
  static calculateStatusSummary(fields: MappingField[], backendSummary?: StatusSummary | null): StatusSummary {
    // If backend provided pre-calculated summary, use it
    if (backendSummary && backendSummary.total > 0) {
      return backendSummary;
    }

    // Fallback: Calculate on frontend (for backwards compatibility)
    const summary: StatusSummary = {
      total: fields.length,
      incompatible: 0,
      warning: 0,
      solved: 0,
      compatible: 0,
    };

    fields.forEach((field) => {
      const status = StatusHelper.getFieldStatus(field);
      summary[status] = (summary[status] ?? 0) + 1;
    });

    return summary;
  }

  static getStatusPercentage(summary: StatusSummary, status: MappingStatus): number {
    if (!summary || summary.total === 0) {
      return 0;
    }
    const value = summary[status] ?? 0;
    return (value / summary.total) * 100;
  }

  static getTotalCompletionPercentage(summary: StatusSummary): number {
    if (!summary || summary.total === 0) {
      return 0;
    }
    const completed = (summary.compatible ?? 0) + (summary.solved ?? 0);
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
