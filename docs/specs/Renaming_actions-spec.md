# Spezifikation: Umbenennung von MappingActions

**Datum:** 10. Dezember 2025  
**Status:** Entwurf  
**Autor:** Automatische Analyse

## 1. Übersicht

Diese Spezifikation beschreibt die notwendigen Änderungen zur Umbenennung folgender MappingActions:

| Alter Name | Neuer Name |
|------------|------------|
| `copy_to` | `copy_value_to` |
| `copy_from` | `copy_value_from` |
| `extension` | `copy_node_to` |

### 1.1 Ziel der Umbenennung

Die neuen Namen verdeutlichen besser die semantische Bedeutung der Actions:
- **`copy_value_to`/`copy_value_from`**: Kopiert den *Wert* eines Feldes zu/von einem anderen Feld
- **`copy_node_to`**: Kopiert einen kompletten *Knoten* (z.B. Extension mit allen Kindfeldern) zu einem Zielfeld

---

## 2. Betroffene Komponenten

### 2.1 Backend (structure-comparer/service)

#### 2.1.1 Python Enum-Definitionen

**Datei:** `service/src/structure_comparer/action.py`
```python
# ALT:
COPY_FROM = "copy_from"
COPY_TO = "copy_to"
EXTENSION = "extension"

# NEU:
COPY_VALUE_FROM = "copy_value_from"
COPY_VALUE_TO = "copy_value_to"
COPY_NODE_TO = "copy_node_to"
```

**Datei:** `service/src/structure_comparer/model/mapping_action_models.py`
```python
# ALT:
COPY_FROM = "copy_from"
COPY_TO = "copy_to"
EXTENSION = "extension"

# NEU:
COPY_VALUE_FROM = "copy_value_from"
COPY_VALUE_TO = "copy_value_to"
COPY_NODE_TO = "copy_node_to"
```

#### 2.1.2 Konstanten und Beschreibungen

**Datei:** `service/src/structure_comparer/consts.py`
```python
# ALT:
Action.COPY_FROM: "Mapped from '{}'",
Action.COPY_TO: "Mapped to '{}'",
Action.EXTENSION: "Extension will be transferred to '{}'",

# NEU:
Action.COPY_VALUE_FROM: "Value copied from '{}'",
Action.COPY_VALUE_TO: "Value copied to '{}'",
Action.COPY_NODE_TO: "Node (extension) will be transferred to '{}'",
```

#### 2.1.3 Mapping-Datenlogik

**Datei:** `service/src/structure_comparer/data/mapping.py`
- Zeile 29-33: `_ACTIONTYPE_TO_LEGACY` Dictionary aktualisieren
- Zeile 73-77: Action-Filterlogik in `fill_allowed_actions()` anpassen

#### 2.1.4 Recommender und Engines

**Datei:** `service/src/structure_comparer/mapping_actions_engine.py`
- Zeile 31: `ActionType.EXTENSION` → `ActionType.COPY_NODE_TO`
- Zeile 234: Ähnliche Änderung

**Datei:** `service/src/structure_comparer/recommendations/copy_recommender.py`
- Zeile 141: Action-Set aktualisieren

#### 2.1.5 OpenAPI Spezifikation

**Datei:** `service/openapi.json`
- Alle Vorkommen von `copy_from`, `copy_to`, `extension` in Enum-Definitionen ersetzen
- Betrifft mehrere Endpoints (Zeilen ~1539, ~1624, ~2743-2744, ~2888-2889, ~5022-5023)

#### 2.1.6 Testdateien

**Verzeichnis:** `service/tests/`
- `test_inherited_copy_recommendations.py`: Alle `copy_from`/`copy_to`-Referenzen
- Weitere Testdateien mit Action-Referenzen

---

### 2.2 Frontend (structure-comparer-frontend)

#### 2.2.1 TypeScript Type-Definitionen

**Datei:** `src/app/models/mapping.model.ts`
```typescript
// ALT (Zeile 54-60):
export type MappingAction =
  | 'copy_from'
  | 'copy_to'
  | 'extension'
  ...

// NEU:
export type MappingAction =
  | 'copy_value_from'
  | 'copy_value_to'
  | 'copy_node_to'
  ...
```

**Datei:** `src/app/models/mapping-evaluation.model.ts`
```typescript
// ALT (Zeile 23-32):
export type ActionType =
  | 'copy_from'
  | 'copy_to'
  | 'extension';

// NEU:
export type ActionType =
  | 'copy_value_from'
  | 'copy_value_to'
  | 'copy_node_to';
```

#### 2.2.2 Helper-Funktionen und Mappings

**Datei:** `src/app/mapping-detail/mapping-detail-helpers.ts`
```typescript
// Zeile 51-54 (CSS-Klassen-Mapping):
// ALT:
copy_from: 'row-copy-from',
copy_to: 'row-copy-to',
extension: 'row-extension',

// NEU:
copy_value_from: 'row-copy-value-from',
copy_value_to: 'row-copy-value-to',
copy_node_to: 'row-copy-node-to',
```

```typescript
// Zeile 161-165 (Action-Labels):
// ALT:
copy_from: 'copy_from',
copy_to: 'copy_to',
extension: 'extension',

// NEU:
copy_value_from: 'copy_value_from',
copy_value_to: 'copy_value_to',
copy_node_to: 'copy_node_to',
```

- Zeile 187, 230, 260: String-Vergleiche für Actions
- Zeile 369, 371: Recommendation-Verarbeitung

#### 2.2.3 Komponenten

**Datei:** `src/app/mapping-detail/mapping-detail.component.ts`
```typescript
// Zeile 331-332 (Icon-Mapping):
'copy_from': 'arrow_back',
'copy_to': 'arrow_forward',
// → Zu 'copy_value_from', 'copy_value_to' umbenennen

// Zeile 350-351 (Label-Mapping):
'copy_from': 'COPY_FROM',
'copy_to': 'COPY_TO',
// → Zu 'copy_value_from': 'COPY_VALUE_FROM', etc.

// Zeile 906-907, 963: Switch-Case und Bedingungen
```

**Datei:** `src/app/edit-property-action-dialog/edit-property-action-dialog.component.ts`
- Zeile 130-137: Action-Filterlogik für Feldauswahl
- String-Vergleiche für 'copy_from', 'copy_to', 'extension'

**Datei:** `src/app/transformation-detail/transformation-detail.component.ts`
- Zeile 806, 1201-1210: Referenzen auf 'copy_from', 'copy_to'

**Datei:** `src/app/edit-target-creation-field-dialog/edit-target-creation-field-dialog.component.ts`
- Zeile 26: Kommentar aktualisieren

#### 2.2.4 HTML Templates

**Datei:** `src/app/mapping-detail/mapping-detail.component.html`
- Zeile 395: `*ngIf="field.action === 'copy_from'"` → `'copy_value_from'`
- Zeile 408: `*ngIf="field.action === 'copy_to'"` → `'copy_value_to'`

**Datei:** `src/app/edit-property-action-dialog/edit-property-action-dialog.component.html`
- Zeile 232-234: Bedingte Labels aktualisieren
- Zeile 296-302: Bedingte Anzeigen
- Zeile 340, 349: 'extension' → 'copy_node_to'

**Datei:** `src/app/shared/tree-table/tree-table.component.html`
- Zeile 178: `*ngIf="row.field.action === 'copy_from'"`
- Zeile 191: `*ngIf="row.field.action === 'copy_to'"`

**Datei:** `src/app/shared/value-mapping-table/value-mapping-table.component.html`
- Zeile 15, 47, 56-57: 'copy_from' Referenzen

#### 2.2.5 CSS-Dateien

**Datei:** `src/app/mapping-detail/mapping-detail.component.css`
```css
/* Zeile 324-328, 390 */
/* ALT: */
.mapping-result .copy-from { }
.mapping-result .copy-to { }
.mapping-consolidated[data-action="extension"] { }

/* NEU: */
.mapping-result .copy-value-from { }
.mapping-result .copy-value-to { }
.mapping-consolidated[data-action="copy_node_to"] { }
```

**Datei:** `src/app/transformation-detail/transformation-detail.component.css`
- Zeile 283: `.table-row.has-copy-from`
- Zeile 386-393: `.copy-from-select`
- Zeile 411: `.action-badge.copy-from`

**Datei:** `src/app/shared/value-mapping-table/value-mapping-table.component.css`
- Zeile 89, 158, 162, 193: 'copy-from' Klassen

**Datei:** `src/app/shared/mapping-action-statistics/mapping-action-statistics.component.css`
- Zeile 225: `.action-badge.action-chip--extension`
- Zeile 370: `.recommendation-badge.recommendation-chip--extension`

**Datei:** `src/app/edit-property-action-dialog/action-selection/action-selection.component.css`
- Zeile 174-179: `[data-action="extension"]`

**Datei:** `src/app/shared/tree-table/tree-table.component.css`
- Zeile 343: `[data-action="extension"]`

**Datei:** `src/app/shared/mapping-action-display/mapping-action-display.component.css`
- Zeile 96: `.detail-badge--extension`

#### 2.2.6 Test-Dateien

**Datei:** `src/app/transformation-detail/transformation-detail.component.spec.ts`
- Zeile 114, 127, 131, 141, 148, 152, 161, 176, 203, 209, 219, 233: Alle 'copy_from'/'copy_to' Referenzen

---

### 2.3 Datenmigration (YAML-Dateien)

Alle bestehenden `manual_entries.yaml` und Projekt-Konfigurationsdateien müssen migriert werden:

**Betroffene Dateien:**
- `neu.yaml`
- `manual_entries.yaml`
- `manual_entries_old.yaml`
- `service/src/structure_comparer/templates/manual_entries_v2_example.yaml`
- `service/tests/files/project/manual_entries.yaml`
- `structure-comparer-projects/*/manual_entries.yaml` (alle Projektverzeichnisse)

**Migration:**
```yaml
# ALT:
- action: copy_from
- action: copy_to
- action: extension

# NEU:
- action: copy_value_from
- action: copy_value_to
- action: copy_node_to
```

---

## 3. Implementierungsplan

### Phase 1: Backend-Änderungen
1. Enum-Definitionen in `action.py` und `mapping_action_models.py` ändern
2. Konstanten in `consts.py` aktualisieren
3. Mapping-Logik in `data/mapping.py` anpassen
4. Recommender und Engines aktualisieren
5. OpenAPI-Spezifikation aktualisieren
6. Backend-Tests anpassen und verifizieren

### Phase 2: Frontend-Änderungen
1. TypeScript-Types aktualisieren
2. Helper-Funktionen und Mappings anpassen
3. Komponenten-Logik aktualisieren
4. HTML-Templates anpassen
5. CSS-Klassen umbenennen
6. Frontend-Tests anpassen und verifizieren

### Phase 3: Datenmigration
1. Migrationsskript für YAML-Dateien erstellen
2. Alle Projektdateien migrieren
3. Beispiel-Dateien aktualisieren

### Phase 4: Rückwärtskompatibilität (Optional)
Falls eine schrittweise Migration gewünscht ist:
1. Backend: Beide Namen temporär akzeptieren
2. Mapping-Layer: Alte Namen auf neue mappen
3. Deprecation-Warnungen hinzufügen
4. Nach Migrationszeitraum: Alte Namen entfernen

---

## 4. Risiken und Mitigation

| Risiko | Mitigation |
|--------|------------|
| Bestehende Projekte funktionieren nicht mehr | Migrationsskript bereitstellen |
| API-Breaking Change | Versionierung der API (v2) oder Rückwärtskompatibilität |
| Unvollständige Umbenennung | Automatisierte Tests nach Umbenennung |
| UI-Brüche | Visuelle Regression-Tests |

---

## 5. Geschätzter Aufwand

| Komponente | Geschätzter Aufwand |
|------------|---------------------|
| Backend-Änderungen | 4-6 Stunden |
| Frontend-Änderungen | 6-8 Stunden |
| Test-Anpassungen | 3-4 Stunden |
| Datenmigration | 2-3 Stunden |
| Review & QA | 2-3 Stunden |
| **Gesamt** | **17-24 Stunden** |

---

## 6. Checkliste für die Umbenennung

### Backend
- [ ] `service/src/structure_comparer/action.py`
- [ ] `service/src/structure_comparer/model/mapping_action_models.py`
- [ ] `service/src/structure_comparer/consts.py`
- [ ] `service/src/structure_comparer/data/mapping.py`
- [ ] `service/src/structure_comparer/mapping_actions_engine.py`
- [ ] `service/src/structure_comparer/recommendations/copy_recommender.py`
- [ ] `service/openapi.json`
- [ ] Alle Test-Dateien in `service/tests/`

### Frontend TypeScript
- [ ] `src/app/models/mapping.model.ts`
- [ ] `src/app/models/mapping-evaluation.model.ts`
- [ ] `src/app/mapping-detail/mapping-detail-helpers.ts`
- [ ] `src/app/mapping-detail/mapping-detail.component.ts`
- [ ] `src/app/edit-property-action-dialog/edit-property-action-dialog.component.ts`
- [ ] `src/app/transformation-detail/transformation-detail.component.ts`
- [ ] `src/app/edit-target-creation-field-dialog/edit-target-creation-field-dialog.component.ts`

### Frontend HTML
- [ ] `src/app/mapping-detail/mapping-detail.component.html`
- [ ] `src/app/edit-property-action-dialog/edit-property-action-dialog.component.html`
- [ ] `src/app/shared/tree-table/tree-table.component.html`
- [ ] `src/app/shared/value-mapping-table/value-mapping-table.component.html`

### Frontend CSS
- [ ] `src/app/mapping-detail/mapping-detail.component.css`
- [ ] `src/app/transformation-detail/transformation-detail.component.css`
- [ ] `src/app/shared/value-mapping-table/value-mapping-table.component.css`
- [ ] `src/app/shared/mapping-action-statistics/mapping-action-statistics.component.css`
- [ ] `src/app/edit-property-action-dialog/action-selection/action-selection.component.css`
- [ ] `src/app/shared/tree-table/tree-table.component.css`
- [ ] `src/app/shared/mapping-action-display/mapping-action-display.component.css`

### Frontend Tests
- [ ] `src/app/transformation-detail/transformation-detail.component.spec.ts`

### YAML-Dateien
- [ ] `neu.yaml`
- [ ] `manual_entries.yaml`
- [ ] `manual_entries_old.yaml`
- [ ] `service/src/structure_comparer/templates/manual_entries_v2_example.yaml`
- [ ] `service/tests/files/project/manual_entries.yaml`
- [ ] Alle `structure-comparer-projects/*/manual_entries.yaml`

---

## 7. Zusammenfassung der String-Ersetzungen

| Suchbegriff | Ersetzung | Kontext |
|-------------|-----------|---------|
| `copy_from` | `copy_value_from` | Action-String |
| `copy_to` | `copy_value_to` | Action-String |
| `extension` (als Action) | `copy_node_to` | Action-String |
| `COPY_FROM` | `COPY_VALUE_FROM` | Enum-Konstante |
| `COPY_TO` | `COPY_VALUE_TO` | Enum-Konstante |
| `EXTENSION` (als Action) | `COPY_NODE_TO` | Enum-Konstante |
| `copy-from` | `copy-value-from` | CSS-Klasse |
| `copy-to` | `copy-value-to` | CSS-Klasse |
| `row-extension` | `row-copy-node-to` | CSS-Klasse |

> **Hinweis:** Bei `extension` muss sorgfältig unterschieden werden zwischen:
> - Der MappingAction `extension` → wird zu `copy_node_to`
> - Dem FHIR-Konzept "Extension" (z.B. `field.extension`, Extension-URLs) → bleibt unverändert
