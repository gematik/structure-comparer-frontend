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

// Special metadata for inherited incompatibility
const INHERITED_INCOMPATIBLE_META = {
  label: '↓ Inkompatibel (vererbt)',  // ↓ indicates inheritance from children
  cssClass: 'status-incompatible-inherited',
  defaultTooltip: 'Feld ist inkompatibel aufgrund von inkompatiblen Kind-Feldern.',
};

export const ACTION_CSS: Record<string, string> = {
  use: 'row-use',
  not_use: 'row-not-use',
  empty: 'row-empty',
  manual: 'row-manual',
  copy_value_from: 'row-copy-value-from',
  copy_value_to: 'row-copy-value-to',
  fixed: 'row-fixed',
  copy_node_to: 'row-copy-node-to',
  copy_node_from: 'row-copy-node-to',  // Same CSS as copy_node_to
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

  /**
   * Checks if a field has max=0 in all its profiles (target profile).
   * This indicates that the field is excluded and its children should not be shown.
   * @param field The mapping field to check
   * @param targetProfileKey Optional: specific profile key to check. If not provided, checks if ANY profile has max=0
   * @returns true if the field has max=0 in the relevant profile(s)
   */
  static hasMaxZeroInTargetProfile(field: MappingField, targetProfileKey?: string): boolean {
    if (!field.profiles) return false;

    const isMaxZero = (max: number | string | undefined): boolean => {
      if (max === undefined || max === null) return false;
      // Handle both number 0 and string "0"
      return max === 0 || max === '0' || String(max) === '0';
    };

    // If a specific target profile key is provided, only check that one
    if (targetProfileKey) {
      const profile = field.profiles[targetProfileKey];
      if (!profile) return false;
      return isMaxZero(profile.max);
    }

    // Otherwise, check if the field has max=0 in ANY profile
    const profileKeys = Object.keys(field.profiles);
    if (profileKeys.length === 0) return false;

    // A field is considered "excluded" if it has max=0 in ANY profile
    // (typically the target profile, but we check all for safety)
    return profileKeys.some(key => {
      const profile = field.profiles![key];
      return profile && isMaxZero(profile.max);
    });
  }

  /**
   * Checks if a field is a child of a parent with max=0.
   * @param fieldName The name/path of the field to check
   * @param excludedParents Set of parent field names that have max=0
   * @returns true if the field is a child of an excluded parent
   */
  static isChildOfExcludedParent(fieldName: string, excludedParents: Set<string>): boolean {
    if (!fieldName || excludedParents.size === 0) return false;

    // Check each potential parent path
    const segments = fieldName.split('.');
    let currentPath = '';

    for (let i = 0; i < segments.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}.${segments[i]}` : segments[i];
      if (excludedParents.has(currentPath)) {
        return true;
      }
    }

    return false;
  }
}

const ACTION_LABELS: Record<ActionType, string> = {
  use: 'use',
  use_recursive: 'use_recursive',
  not_use: 'not_use',
  empty: 'empty',
  copy_value_from: 'copy_value_from',
  copy_value_to: 'copy_value_to',
  fixed: 'fixed',
  manual: 'manual',
  copy_node_to: 'copy_node_to',
  copy_node_from: 'copy_node_from',
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

    if (actionInfo.action === 'copy_value_from' || actionInfo.action === 'copy_value_to' || actionInfo.action === 'copy_node_to' || actionInfo.action === 'copy_node_from') {
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

    if ((actionInfo.action === 'copy_value_from' || actionInfo.action === 'copy_value_to' || actionInfo.action === 'copy_node_to' || actionInfo.action === 'copy_node_from') && actionInfo.other_value) {
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

    if ((actionInfo.action === 'copy_value_from' || actionInfo.action === 'copy_value_to' || actionInfo.action === 'copy_node_to' || actionInfo.action === 'copy_node_from') && actionInfo.other_value) {
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

  static formatValue(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value === 'string') {
      return value.trim() || null;
    }
    return JSON.stringify(value);
  }
}

// Recommendation utilities
export class RecommendationHelper {
  /**
   * Check if a field has recommendations (after filtering by allowed actions)
   */
  static hasRecommendation(field: MappingField): boolean {
    return this.getRecommendations(field).length > 0;
  }

  /**
   * Get all recommendations for a field
   * Returns an empty array if no recommendations exist
   *
   * Note: We do NOT filter by actions_allowed here because:
   * 1. The backend already validates recommendations before creating them
   * 2. Greedy inheritance may create valid recommendations (e.g., copy_value_to for child fields)
   *    even if the field's actions_allowed doesn't include that action
   * 3. actions_allowed is for MANUAL actions, not for system-generated recommendations
   */
  static getRecommendations(field: MappingField): ActionInfo[] {
    return field.recommendations || [];
  }

  /**
   * Get the first recommendation (for backwards compatibility)
   * Returns undefined if no recommendations exist
   */
  static getFirstRecommendation(field: MappingField): ActionInfo | undefined {
    const recommendations = this.getRecommendations(field);
    return recommendations.length > 0 ? recommendations[0] : undefined;
  }

  /**
   * Build label for a recommendation
   * Returns the action name in uppercase, same format as active actions
   * Note: Does NOT include other_value - that's shown in separate detail badge
   */
  static buildRecommendationLabel(recommendation: ActionInfo): string {
    if (!recommendation || !recommendation.action) {
      return 'KEINE EMPFEHLUNG';
    }

    // Use the same labels as active actions (without other_value)
    return ACTION_LABELS[recommendation.action] ?? 'UNBEKANNT';
  }

  /**
   * Get the action type from recommendation for CSS class generation
   */
  static getRecommendationAction(recommendation: ActionInfo): string | null {
    return recommendation?.action ?? null;
  }

  /**
   * Build tooltip for a recommendation
   */
  static buildRecommendationTooltip(recommendation: ActionInfo): string {
    if (!recommendation) {
      return '';
    }

    const lines: string[] = ['Empfohlene Aktion (noch nicht angewendet)'];

    if (recommendation.system_remark) {
      lines.push(recommendation.system_remark);
    }

    // Add other_value information for copy actions
    if (recommendation.other_value && typeof recommendation.other_value === 'string') {
      if (recommendation.action === 'copy_value_from') {
        lines.push(`Quelle: ${recommendation.other_value}`);
      } else if (recommendation.action === 'copy_value_to') {
        lines.push(`Ziel: ${recommendation.other_value}`);
      }
    }

    // Add fixed_value information for fixed actions
    if (recommendation.fixed_value && recommendation.action === 'fixed') {
      lines.push(`Fester Wert: ${recommendation.fixed_value}`);
    }

    return lines.join('\n');
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
      // Format user-friendly messages based on message_key
      const classification = reason.details?.['classification'] as string;
      const fieldName = reason.details?.['field'] as string;

      switch (reason.message_key) {
        case 'mapping.reason.field.incompatible':
          if (classification === 'incompatible') {
            return '❌ Feld ist inkompatibel\n→ Fügen Sie eine Mapping-Aktion hinzu, um das Problem zu lösen';
          } else if (classification === 'target_required') {
            return '❌ Pflichtfeld im Ziel fehlt\n→ Fügen Sie eine Mapping-Aktion hinzu (z.B. fixed_value, copy, transform)';
          } else if (classification === 'cardinality_mismatch') {
            return '❌ Kardinalität ist inkompatibel\n→ Passen Sie die Kardinalität an oder fügen Sie eine spezielle Aktion hinzu';
          } else if (classification === 'type_mismatch') {
            return '❌ Datentypen sind inkompatibel\n→ Fügen Sie eine Transform-Aktion hinzu, um den Typ zu konvertieren';
          }
          return '❌ Feld ist inkompatibel\n→ Fügen Sie eine passende Mapping-Aktion hinzu';

        case 'mapping.reason.field.warning':
          if (classification === 'removed_from_source') {
            return '⚠️ Feld wurde aus der Quelle entfernt\n→ Prüfen Sie, ob das Mapping noch benötigt wird';
          } else if (classification === 'added_to_target') {
            return '⚠️ Neues Feld im Ziel hinzugefügt\n→ Prüfen Sie, ob eine Mapping-Aktion erforderlich ist';
          }
          return '⚠️ Feld hat Warnungen\n→ Überprüfen Sie das Feld und erwägen Sie eine Anpassung';

        case 'mapping.reason.field.incompatible.resolved':
          const resolvedAction = reason.related_action || 'Mapping-Aktion';
          return `✓ Inkompatibilität gelöst durch: ${resolvedAction}`;

        case 'mapping.reason.field.warning.resolved':
          const warningAction = reason.related_action || 'Mapping-Aktion';
          return `✓ Warnung adressiert durch: ${warningAction}`;

        case 'mapping.reason.target_required.not_use':
          return `❌ Pflichtfeld im Ziel kann nicht ignoriert werden${fieldName ? ': ' + fieldName : ''}\n→ Entfernen Sie die 'not_use' Aktion oder fügen Sie eine andere Aktion hinzu`;

        case 'mapping.reason.parent.inherited_incompatible':
          // This should be filtered out in getFieldStatusTooltip, but just in case
          const childCount = reason.details?.['incompatible_children_count'] as number;
          return `⚠️ Inkompatibilität vererbt von ${childCount} Kind-Feld${childCount === 1 ? '' : 'ern'}\n→ Lösen Sie die Probleme in den Kind-Feldern`;

        default:
          // Fallback: Show technical details but more readable
          const severity = reason.severity === 'error' ? '❌' :
                          reason.severity === 'warning' ? '⚠️' : 'ℹ️';
          const actionSuffix = reason.related_action ? ` (Aktion: ${reason.related_action})` : '';
          return `${severity} ${reason.message_key}${actionSuffix}`;
      }
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

  /**
   * Check if a field has inherited incompatibility from its children
   */
  static hasInheritedIncompatibility(field: MappingField): boolean {
    const evaluation = field.evaluation;
    if (!evaluation) return false;

    return evaluation.reasons.some(
      reason => reason.code === 'INHERITED_INCOMPATIBLE_FROM_CHILDREN'
    );
  }

  /**
   * Get list of incompatible children for a field with inherited incompatibility
   */
  static getIncompatibleChildren(field: MappingField): string[] {
    const evaluation = field.evaluation;
    if (!evaluation) return [];

    const inheritedReason = evaluation.reasons.find(
      reason => reason.code === 'INHERITED_INCOMPATIBLE_FROM_CHILDREN'
    );

    if (inheritedReason && inheritedReason.details) {
      return (inheritedReason.details['incompatible_children'] as string[]) || [];
    }

    return [];
  }

  static getLabelForStatus(status: MappingStatus): string {
    return STATUS_META[status]?.label ?? STATUS_META[FALLBACK_STATUS].label;
  }

  /**
   * Get label for status with special handling for inherited incompatibility
   */
  static getLabelForField(field: MappingField): string {
    const status = this.getFieldStatus(field);

    // Check if this is an inherited incompatibility
    if (status === 'incompatible' && this.hasInheritedIncompatibility(field)) {
      return INHERITED_INCOMPATIBLE_META.label;
    }

    return this.getLabelForStatus(status);
  }

  static getClassForStatus(status: MappingStatus): string {
    return STATUS_META[status]?.cssClass ?? STATUS_META[FALLBACK_STATUS].cssClass;
  }

  /**
   * Get CSS class for status with special handling for inherited incompatibility
   */
  static getClassForField(field: MappingField): string {
    const status = this.getFieldStatus(field);

    // Check if this is an inherited incompatibility
    if (status === 'incompatible' && this.hasInheritedIncompatibility(field)) {
      return INHERITED_INCOMPATIBLE_META.cssClass;
    }

    return this.getClassForStatus(status);
  }

  static getDefaultTooltip(status: MappingStatus): string {
    return STATUS_META[status]?.defaultTooltip ?? STATUS_META[FALLBACK_STATUS].defaultTooltip;
  }

  static getFieldStatusLabel(field: MappingField): string {
    return this.getLabelForField(field);
  }

  static getFieldStatusClass(field: MappingField): string {
    return this.getClassForField(field);
  }

  static getFieldStatusTooltip(field: MappingField): string[] {
    // Check for inherited incompatibility first
    if (this.hasInheritedIncompatibility(field)) {
      const children = this.getIncompatibleChildren(field);
      const lines: string[] = [];

      const childrenInfo = children.length > 0
        ? ` (${children.length} inkompatible${children.length === 1 ? 's' : ''} Kind-Feld${children.length === 1 ? '' : 'er'})`
        : '';
      lines.push(`⚠️ Inkompatibel vererbt von Kind-Feldern${childrenInfo}`);

      // Add list of incompatible children that need to be solved
      if (children.length > 0) {
        lines.push(''); // Empty line for separation
        lines.push('Zu lösen:');
        children.forEach(child => {
          lines.push(`  • ${child}`);
        });
      }

      return lines;
    }

    // For non-inherited incompatibility, show evaluation details
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
