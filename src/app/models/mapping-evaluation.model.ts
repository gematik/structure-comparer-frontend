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

/** Action and evaluation domain models mirrored from backend Step 3. */
export type ActionType =
  | 'use'
  | 'not_use'
  | 'empty'
  | 'extension'
  | 'copy_from'
  | 'copy_to'
  | 'fixed'
  | 'other';

export type ActionSource = 'manual' | 'inherited' | 'system_default';

export type EvaluationSeverity = 'info' | 'warning' | 'error';

export type EvaluationStatus =
  | 'ok'
  | 'action_required'
  | 'resolved'
  | 'incompatible'
  | 'unknown'
  | 'evaluation_failed';

export type MappingStatus =
  | 'incompatible'
  | 'warning'
  | 'solved'
  | 'compatible';

export interface ActionInfo {
  action: ActionType;
  source: ActionSource;

  inherited_from?: string | null;
  auto_generated?: boolean;

  user_remark?: string | null;
  system_remark?: string | null;

  fixed_value?: unknown;
  other_value?: unknown;

  raw_manual_entry?: Record<string, unknown> | null;
}

export interface EvaluationReason {
  code: string;
  severity: EvaluationSeverity;
  message_key: string;
  details: Record<string, unknown>;
  related_action?: ActionType | null;
}

export interface EvaluationResult {
  status: EvaluationStatus;
  reasons: EvaluationReason[];
  has_warnings: boolean;
  has_errors: boolean;
  summary_key?: string | null;
  mapping_status: MappingStatus;
}

export interface MappingEvaluationSummary {
  mapping_id: string;
  mapping_name: string;
  total_fields: number;
  compatible: number;
  warnings: number;
  incompatible: number;
  action_resolved: number;
  action_mitigated: number;
  needs_attention: number;
  simplified_compatible?: number | null;
  simplified_resolved?: number | null;
  simplified_needs_action?: number | null;
}

export interface MappingEvaluation {
  mapping_id: string;
  mapping_name: string;
  field_evaluations: Record<string, EvaluationResult>;
  summary: {
    total_fields: number;
    compatible: number;
    warnings: number;
    incompatible: number;
    action_resolved: number;
    action_mitigated: number;
    needs_attention: number;
  };
}
