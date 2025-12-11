# Spezifikation: Gegenseitige Referenzierung bei Copy_Node_To

**Version:** 1.0  
**Datum:** 11. Dezember 2025  
**Status:** ✅ Implementierung abgeschlossen - Tests ausstehend

---

## 1. Zusammenfassung

Diese Spezifikation beschreibt die Implementierung einer gegenseitigen Referenzierung für `copy_node_to` Actions, analog zum bestehenden Verhalten bei `copy_value_from`/`copy_value_to`.

### Kernfrage
Soll eine neue Action `copy_node_from` erstellt werden, oder kann das bestehende System erweitert werden?

**Empfehlung:** Eine neue Action `COPY_NODE_FROM` sollte erstellt werden, um Konsistenz mit `copy_value_from`/`copy_value_to` zu gewährleisten.

---

## 2. Ist-Zustand Analyse

### 2.1 Bestehende Implementierung: copy_value_from/copy_value_to

#### 2.1.1 Backend-Architektur (Python)

Die gegenseitige Referenzierung funktioniert **NICHT** durch das Speichern beider Einträge in `manual_entries.yaml`, sondern durch **dynamische Ableitung zur Laufzeit**.

**Schlüsseldatei:** `service/src/structure_comparer/mapping_actions_engine.py`

```python
# Zeile 357-377
def _augment_copy_links(manual_map: Dict[str, dict]) -> Dict[str, dict]:
    if not manual_map:
        return {}

    augmented: Dict[str, dict] = {
        name: dict(entry) for name, entry in manual_map.items()
    }

    for name, entry in manual_map.items():
        action = _parse_action(entry.get("action"))
        other = entry.get("other")
        if not other:
            continue

        if action == ActionType.COPY_VALUE_FROM:
            augmented.setdefault(
                other,
                {"action": ActionType.COPY_VALUE_TO.value, "other": name, "_derived": True},
            )
        elif action == ActionType.COPY_VALUE_TO:
            augmented.setdefault(
                other,
                {"action": ActionType.COPY_VALUE_FROM.value, "other": name, "_derived": True},
            )

    return augmented
```

**Funktionsweise:**
1. Beim Laden der Mappings werden alle `manual_entries` normalisiert
2. Die Funktion `_augment_copy_links()` scannt alle Einträge
3. Für jeden `copy_value_from` Eintrag wird ein virtueller `copy_value_to` Eintrag für das Zielfeld erstellt (und umgekehrt)
4. Diese virtuellen Einträge werden mit `_derived: True` markiert
5. Sie werden **nur im Speicher** gehalten, nicht in `manual_entries.yaml` gespeichert

#### 2.1.2 Speicherung in manual_entries.yaml

In der YAML-Datei wird **nur ein Eintrag** gespeichert:

```yaml
# Beispiel: Field A kopiert Wert von Field B
- action: copy_value_from
  name: Medication.extension:isVaccine.value[x]
  other: Medication.extension:Impfstoff.value[x]
  
# Der Partner-Eintrag für Medication.extension:Impfstoff.value[x]
# wird NICHT gespeichert, sondern zur Laufzeit abgeleitet!
```

#### 2.1.3 API-Endpunkte

**POST** `/project/{project_key}/mapping/{mapping_id}/field/{field_name}`

- Ruft `mapping_handler.set_field()` auf
- Speichert den neuen Eintrag in `manual_entries.yaml`
- Die Partner-Ableitung erfolgt erst beim nächsten Laden durch `_augment_copy_links()`

#### 2.1.4 Cleanup bei Löschen

**Datei:** `service/src/structure_comparer/handler/mapping.py` (Zeile 180-200)

```python
# Clean up partners before deleting
if (manual_entry := manual_entries.get(field_name)) and (
    manual_entry.action in [Action.COPY_VALUE_FROM, Action.COPY_VALUE_TO]
):
    other_name = manual_entry.other
    if other_name and other_name not in fields_to_delete:
        try:
            existing_partner = manual_entries[other_name]
            if existing_partner.other == field_name:
                fields_to_delete.add(other_name)
        except (KeyError, AttributeError, StopIteration):
            pass
```

### 2.2 Aktuelle copy_node_to Implementierung

#### 2.2.1 Action-Definition

**Datei:** `service/src/structure_comparer/action.py`

```python
class Action(StrEnum):
    # ...
    COPY_NODE_TO = "copy_node_to"
    # COPY_NODE_FROM existiert NICHT!
```

**Datei:** `service/src/structure_comparer/model/mapping_action_models.py`

```python
class ActionType(str, Enum):
    # ...
    COPY_NODE_TO = "copy_node_to"  # For source extensions/nodes to be copied to any target field
    # COPY_NODE_FROM existiert NICHT!
```

#### 2.2.2 Gegenseitige Referenzierung: NICHT IMPLEMENTIERT

In `_augment_copy_links()` wird `COPY_NODE_TO` **nicht behandelt**. Das bedeutet:

- Wenn Feld A mit `copy_node_to → B` annotiert wird, erhält Feld B **keine** Gegenreferenz
- Feld B zeigt keinen Hinweis, dass es Daten von Feld A erhält
- Das ist **inkonsistent** mit dem Verhalten von `copy_value_from`/`copy_value_to`

#### 2.2.3 Frontend-Handling

**Datei:** `src/app/edit-property-action-dialog/edit-property-action-dialog.component.ts`

```typescript
// copy_node_to wird wie copy_value_from/copy_value_to behandelt
requiresTargetField(): boolean {
  return this.selectedAction === 'copy_value_from' 
      || this.selectedAction === 'copy_value_to' 
      || this.selectedAction === 'copy_node_to';
}
```

---

## 3. Analyse: COPY_NODE_FROM vs. Bidirektionales COPY_NODE_TO

### 3.1 Option A: Neue Action COPY_NODE_FROM (EMPFOHLEN)

#### Vorteile:
1. **Konsistenz**: Gleiche Architektur wie `copy_value_from`/`copy_value_to`
2. **Semantische Klarheit**: 
   - `copy_node_to`: "Dieser Knoten wird NACH dort kopiert"
   - `copy_node_from`: "Dieser Knoten empfängt Daten VON dort"
3. **UI/UX Natürlichkeit**: Benutzer kann von beiden Seiten annotieren
4. **Einfache Implementierung**: Bestehende Muster können kopiert werden
5. **Zukunftssicher**: Ermöglicht unterschiedliche Behandlung in speziellen Fällen

#### Nachteile:
1. Neue Enum-Werte in Frontend und Backend erforderlich
2. Mehr Code zu pflegen (minimal, da Muster wiederverwendbar)

### 3.2 Option B: Bidirektionales COPY_NODE_TO

#### Vorteile:
1. Keine neue Action erforderlich
2. Weniger Änderungen

#### Nachteile:
1. **Semantisch verwirrend**: Zwei Felder haben beide `copy_node_to` aufeinander zeigend
2. **Asymmetrisch**: Bei `copy_value_*` gibt es FROM und TO, aber nicht bei NODE
3. **UI-Verwirrung**: Wie erklärt man dem Benutzer, welches Feld Quelle und welches Ziel ist?
4. **Schwieriger zu implementieren**: Speziallogik erforderlich

### 3.3 Empfehlung

**Option A: COPY_NODE_FROM** ist zu empfehlen, weil:
- Es dem etablierten Muster von `copy_value_from`/`copy_value_to` folgt
- Die Implementierung straightforward ist (bestehender Code kann angepasst werden)
- Die Semantik klar und verständlich ist

---

## 4. Detaillierte Implementierung

### 4.1 Backend-Änderungen

#### 4.1.1 Neue Enum-Werte hinzufügen

**Datei:** `service/src/structure_comparer/action.py`

```python
class Action(StrEnum):
    USE = "use"
    USE_RECURSIVE = "use_recursive"
    NOT_USE = "not_use"
    EMPTY = "empty"
    MANUAL = "manual"
    COPY_VALUE_FROM = "copy_value_from"
    COPY_VALUE_TO = "copy_value_to"
    FIXED = "fixed"
    COPY_NODE_TO = "copy_node_to"
    COPY_NODE_FROM = "copy_node_from"  # NEU
```

**Datei:** `service/src/structure_comparer/model/mapping_action_models.py`

```python
class ActionType(str, Enum):
    # ...
    COPY_NODE_TO = "copy_node_to"
    COPY_NODE_FROM = "copy_node_from"  # NEU: Knoten wird von anderem Feld empfangen
```

#### 4.1.2 Konstanten erweitern

**Datei:** `service/src/structure_comparer/consts.py`

```python
REMARKS = {
    # ...
    Action.COPY_NODE_TO: "Node will be transferred to '{}'",
    Action.COPY_NODE_FROM: "Node will be received from '{}'",  # NEU
}

DESCRIPTIONS = {
    # ...
    Action.COPY_NODE_TO: "Node (extension) will be TRANSFERRED to target field",
    Action.COPY_NODE_FROM: "Node (extension) will be RECEIVED from source field",  # NEU
}
```

#### 4.1.3 Partner-Ableitung implementieren

**Datei:** `service/src/structure_comparer/mapping_actions_engine.py`

```python
def _augment_copy_links(manual_map: Dict[str, dict]) -> Dict[str, dict]:
    # ... existing code ...

    for name, entry in manual_map.items():
        action = _parse_action(entry.get("action"))
        other = entry.get("other")
        if not other:
            continue

        if action == ActionType.COPY_VALUE_FROM:
            augmented.setdefault(
                other,
                {"action": ActionType.COPY_VALUE_TO.value, "other": name, "_derived": True},
            )
        elif action == ActionType.COPY_VALUE_TO:
            augmented.setdefault(
                other,
                {"action": ActionType.COPY_VALUE_FROM.value, "other": name, "_derived": True},
            )
        # NEU: copy_node_to/copy_node_from Partner-Ableitung
        elif action == ActionType.COPY_NODE_TO:
            augmented.setdefault(
                other,
                {"action": ActionType.COPY_NODE_FROM.value, "other": name, "_derived": True},
            )
        elif action == ActionType.COPY_NODE_FROM:
            augmented.setdefault(
                other,
                {"action": ActionType.COPY_NODE_TO.value, "other": name, "_derived": True},
            )

    return augmented
```

#### 4.1.4 Actions Allowed Liste erweitern

**Datei:** `service/src/structure_comparer/data/mapping.py`

```python
def fill_allowed_actions(self, source_profiles: List[str], target_profile: str):
    allowed = set([c for c in Action])

    any_source_present = any(
        [self.profiles[profile] is not None for profile in source_profiles]
    )
    target_present = self.profiles[target_profile] is not None

    if not any_source_present:
        # Wenn kein Source-Profil vorhanden: copy_value_from und copy_node_from nicht erlaubt
        allowed -= set([Action.USE, Action.NOT_USE, Action.COPY_VALUE_FROM, Action.COPY_NODE_FROM])
    else:
        allowed -= set([Action.EMPTY])
    if not target_present:
        # Wenn kein Target-Profil vorhanden: copy_value_to und copy_node_to nicht erlaubt
        allowed -= set([Action.USE, Action.EMPTY, Action.COPY_VALUE_TO, Action.COPY_NODE_TO])

    self.actions_allowed = list(allowed)
```

#### 4.1.5 Handler Cleanup erweitern

**Datei:** `service/src/structure_comparer/handler/mapping.py`

```python
# Alle Stellen wo COPY_VALUE_FROM/COPY_VALUE_TO behandelt werden:
# Hinzufügen: Action.COPY_NODE_FROM, Action.COPY_NODE_TO

# Zeile ~186
if (manual_entry := manual_entries.get(field_name)) and (
    manual_entry.action in [
        Action.COPY_VALUE_FROM, Action.COPY_VALUE_TO,
        Action.COPY_NODE_FROM, Action.COPY_NODE_TO  # NEU
    ]
):

# Zeile ~222
if new_entry.action in [
    Action.COPY_VALUE_FROM, Action.COPY_VALUE_TO, 
    Action.COPY_NODE_TO, Action.COPY_NODE_FROM  # NEU
]:

# Zeile ~243
if (manual_entry := manual_entries.get(field.name)) and (
    manual_entry.action in [
        Action.COPY_VALUE_FROM, Action.COPY_VALUE_TO, 
        Action.COPY_NODE_TO, Action.COPY_NODE_FROM  # NEU
    ]
):
```

#### 4.1.6 Recommendation Engine erweitern

**Datei:** `service/src/structure_comparer/recommendations/copy_recommender.py`

```python
# Zeile ~141 - Action types erweitern
action_types={
    ActionType.COPY_VALUE_FROM, 
    ActionType.COPY_VALUE_TO, 
    ActionType.COPY_NODE_TO,
    ActionType.COPY_NODE_FROM  # NEU
}
```

#### 4.1.7 Migration für bestehende Daten

**Datei:** `service/src/structure_comparer/manual_entries_migration.py`

```python
CLASSIFICATION_TO_ACTION = {
    # ... existing mappings ...
    "copy_node_to": "copy_node_to",
    "copy_node_from": "copy_node_from",  # NEU (für Zukunft)
}
```

### 4.2 Frontend-Änderungen

#### 4.2.1 TypeScript Type-Definitionen

**Datei:** `src/app/models/mapping.model.ts`

```typescript
export type MappingAction =
  | 'use'
  | 'use_recursive'
  | 'not_use'
  | 'empty'
  | 'copy_value_from'
  | 'copy_value_to'
  | 'fixed'
  | 'manual'
  | 'copy_node_to'
  | 'copy_node_from';  // NEU
```

**Datei:** `src/app/models/mapping-evaluation.model.ts`

```typescript
export type ActionType =
  | 'use'
  | 'use_recursive'
  | 'not_use'
  | 'empty'
  | 'copy_value_from'
  | 'copy_value_to'
  | 'fixed'
  | 'manual'
  | 'copy_node_to'
  | 'copy_node_from';  // NEU
```

#### 4.2.2 Helper-Funktionen erweitern

**Datei:** `src/app/mapping-detail/mapping-detail-helpers.ts`

```typescript
export const ACTION_CSS: Record<string, string> = {
  // ...
  copy_node_to: 'row-copy-node-to',
  copy_node_from: 'row-copy-node-from',  // NEU
};

const ACTION_LABELS: Record<ActionType, string> = {
  // ...
  copy_node_to: 'copy_node_to',
  copy_node_from: 'copy_node_from',  // NEU
};

// In buildActionLabel, buildActionSubLabel, buildActionTooltip:
// copy_node_from hinzufügen zu den Bedingungen die other_value anzeigen
if (actionInfo.action === 'copy_value_from' 
    || actionInfo.action === 'copy_value_to' 
    || actionInfo.action === 'copy_node_to'
    || actionInfo.action === 'copy_node_from') {  // NEU
```

#### 4.2.3 Edit Dialog erweitern

**Datei:** `src/app/edit-property-action-dialog/edit-property-action-dialog.component.ts`

```typescript
requiresTargetField(): boolean {
  return this.selectedAction === 'copy_value_from' 
      || this.selectedAction === 'copy_value_to' 
      || this.selectedAction === 'copy_node_to'
      || this.selectedAction === 'copy_node_from';  // NEU
}

getRelevantProfileNames(): string[] {
  if (this.selectedAction === 'copy_value_from' 
      || this.selectedAction === 'copy_node_from') {  // NEU
    return this.data.sources.map(s => (s as any).key || s.name);
  } else if (this.selectedAction === 'copy_value_to' 
      || this.selectedAction === 'copy_node_to') {  // NEU
    return [(this.data.target as any).key || this.data.target.name];
  }
  return [];
}
```

#### 4.2.4 Action Display Component erweitern

**Datei:** `src/app/shared/mapping-action-display/mapping-action-display.component.ts`

```typescript
// Icon mapping
'copy_node_to': 'swap_horiz',
'copy_node_from': 'swap_horiz',  // NEU (gleiches Icon)

// Label mapping
'copy_node_to': 'COPY_NODE_TO',
'copy_node_from': 'COPY_NODE_FROM',  // NEU

// Description mapping
'copy_node_to': 'Knoten wird in anderes Feld kopiert',
'copy_node_from': 'Knoten wird von anderem Feld empfangen',  // NEU

// In getRecommendationOtherValue:
if (recommendation.action !== 'copy_value_from' 
    && recommendation.action !== 'copy_value_to' 
    && recommendation.action !== 'copy_node_to'
    && recommendation.action !== 'copy_node_from') {  // NEU
```

#### 4.2.5 Statistics Component erweitern

**Datei:** `src/app/shared/mapping-action-statistics/mapping-action-statistics.component.ts`

```typescript
// Icon mapping
'copy_node_from': 'swap_horiz',  // NEU

// Label mapping
'copy_node_from': 'COPY_NODE_FROM',  // NEU

// Actions to display
const actionsToDisplay: MappingAction[] = [
  'use', 'use_recursive', 'not_use', 'empty', 
  'copy_value_from', 'copy_value_to', 
  'copy_node_to', 'copy_node_from',  // NEU
  'fixed', 'manual'
];
```

#### 4.2.6 CSS-Klassen hinzufügen

**Datei:** `src/app/mapping-detail/mapping-detail.component.css`

```css
.row-copy-node-from {
  background-color: #E3F2FD;  /* Gleiche Farbe wie copy_node_to oder leicht abweichend */
}
```

---

## 5. Edge Cases und Konfliktbehandlung

### 5.1 Was passiert, wenn das Zielfeld bereits eine Action hat?

**Aktuelles Verhalten bei copy_value_from/copy_value_to:**
- Die Partner-Ableitung verwendet `setdefault()`, d.h. existierende Einträge werden NICHT überschrieben
- Wenn Feld B bereits eine manuelle Action hat und A mit `copy_value_to → B` annotiert wird, behält B seine Action

**Empfehlung für copy_node_from/copy_node_to:**
- Gleiches Verhalten implementieren
- Bei Konflikt: Warnung im UI anzeigen

### 5.2 Was passiert beim Löschen einer copy_node_to Annotation?

**Aktuelles Verhalten:**
- Der Handler prüft, ob der Partner-Eintrag auf das gelöschte Feld verweist
- Wenn ja, wird auch der Partner-Eintrag gelöscht

**Für copy_node_from/copy_node_to:**
- Gleiches Verhalten implementieren
- Beide Actions in die Cleanup-Logik aufnehmen

### 5.3 Zirkuläre Referenzen

**Szenario:** A → B und B → A

**Lösung:** 
- `_augment_copy_links()` verwendet `setdefault()`, was Überschreibungen verhindert
- Die erste gesetzte Referenz gewinnt
- Keine Endlosschleifen möglich

### 5.4 Kind-Vererbung

**Aktuelles Verhalten:**
- Bei `copy_node_to` werden Kind-Felder als Recommendations verarbeitet
- Das `other_value` wird für jedes Kind-Feld angepasst (z.B. `A.id → B.id`)

**Für copy_node_from:**
- Gleiches Verhalten in `CopyRecommender` implementieren
- `COPY_NODE_FROM` zur `action_types` Menge hinzufügen

---

## 6. Testfälle

### 6.1 Unit Tests Backend

```python
# test_mapping_actions_engine.py

def test_copy_node_to_derives_partner_copy_node_from():
    """copy_node_to should derive a partner copy_node_from action."""
    mapping = StubMapping([
        "Medication.extension:source",
        "Medication.extension:target",
    ])
    manual_entries = {
        "Medication.extension:source": {
            "action": "copy_node_to",
            "other": "Medication.extension:target",
        }
    }

    result = compute_mapping_actions(mapping, manual_entries)

    source_info = result["Medication.extension:source"]
    partner_info = result["Medication.extension:target"]

    assert source_info.action == ActionType.COPY_NODE_TO
    assert source_info.source == ActionSource.MANUAL
    assert partner_info.action == ActionType.COPY_NODE_FROM
    assert partner_info.source == ActionSource.MANUAL
    assert partner_info.other_value == "Medication.extension:source"


def test_copy_node_from_derives_partner_copy_node_to():
    """copy_node_from should derive a partner copy_node_to action."""
    mapping = StubMapping([
        "Medication.extension:source",
        "Medication.extension:target",
    ])
    manual_entries = {
        "Medication.extension:target": {
            "action": "copy_node_from",
            "other": "Medication.extension:source",
        }
    }

    result = compute_mapping_actions(mapping, manual_entries)

    target_info = result["Medication.extension:target"]
    partner_info = result["Medication.extension:source"]

    assert target_info.action == ActionType.COPY_NODE_FROM
    assert target_info.source == ActionSource.MANUAL
    assert partner_info.action == ActionType.COPY_NODE_TO
    assert partner_info.source == ActionSource.MANUAL
    assert partner_info.other_value == "Medication.extension:target"


def test_copy_node_to_with_existing_target_action():
    """copy_node_to should not override existing action on target field."""
    mapping = StubMapping([
        "Medication.extension:source",
        "Medication.extension:target",
    ])
    manual_entries = {
        "Medication.extension:source": {
            "action": "copy_node_to",
            "other": "Medication.extension:target",
        },
        "Medication.extension:target": {
            "action": "use",  # Existing action
        }
    }

    result = compute_mapping_actions(mapping, manual_entries)

    # Target should keep its existing action
    target_info = result["Medication.extension:target"]
    assert target_info.action == ActionType.USE


def test_copy_node_deletion_cleans_up_partner():
    """Deleting copy_node_to should also clean up partner entry."""
    # Test implementation in handler tests
    pass
```

### 6.2 Frontend Tests

```typescript
// edit-property-action-dialog.component.spec.ts

describe('copy_node_from handling', () => {
  it('should require target field for copy_node_from', () => {
    component.selectedAction = 'copy_node_from';
    expect(component.requiresTargetField()).toBeTrue();
  });

  it('should show source profile fields for copy_node_from', () => {
    component.selectedAction = 'copy_node_from';
    const profiles = component.getRelevantProfileNames();
    expect(profiles).toEqual(/* source profile names */);
  });
});
```

### 6.3 Integrationstests

1. **UI Test:** Benutzer setzt `copy_node_to` auf Feld A → Feld B zeigt `copy_node_from` an
2. **UI Test:** Benutzer löscht Action auf Feld A → Feld B Action wird auch entfernt
3. **API Test:** POST request mit `copy_node_from` speichert korrekt in YAML
4. **API Test:** GET request für Partner-Feld zeigt abgeleitete Action

---

## 7. Migrationsstrategie

### 7.1 Bestehende Daten

Bestehende `copy_node_to` Einträge in `manual_entries.yaml` benötigen **keine Migration**:
- Die Partner-Ableitung erfolgt zur Laufzeit
- Nach Deployment werden alle Partner automatisch angezeigt

### 7.2 Rollback-Plan

Falls Probleme auftreten:
- `copy_node_from` kann im Frontend ausgeblendet werden
- Die `_augment_copy_links()` Erweiterung hat keine Nebenwirkungen auf bestehende Daten

---

## 8. Aufwandsschätzung

| Komponente | Geschätzter Aufwand |
|------------|---------------------|
| Backend: Neue Enum-Werte | 0.5h |
| Backend: _augment_copy_links | 0.5h |
| Backend: Handler Cleanup | 1h |
| Backend: Actions Allowed | 0.5h |
| Backend: Recommendations | 0.5h |
| Backend: Unit Tests | 2h |
| Frontend: Type-Definitionen | 0.5h |
| Frontend: Helper-Funktionen | 1h |
| Frontend: Edit Dialog | 1h |
| Frontend: Display Components | 1h |
| Frontend: CSS | 0.25h |
| Frontend: Unit Tests | 1.5h |
| Integration Tests | 2h |
| Code Review & Fixes | 2h |
| **Gesamt** | **~14h** |

---

## 9. Offene Fragen (BEANTWORTET)

1. **UI-Label:** Sollte `copy_node_from` als "EMPFÄNGT VON" oder "KOPIERT VON" angezeigt werden?
   - ✅ **Antwort:** Label ist `copy_node_from` (konsistent mit anderen Actions)
2. **Icon:** Gleiches Icon wie `copy_node_to` oder gespiegeltes Icon?
   - ✅ **Antwort:** Gespiegeltes Icon (zeigt Richtungsunterschied)
3. **Farbe:** Gleiche CSS-Klasse oder eigene Hintergrundfarbe?
   - ✅ **Antwort:** Gleiches CSS wie `copy_node_to`

---

## 10. Nächste Schritte

**Status:** ✅ Implementierung abgeschlossen (11. Dezember 2025)

1. [x] Backend: Enum-Werte hinzufügen *(erledigt)*
2. [x] Backend: `_augment_copy_links()` erweitern *(erledigt)*
3. [x] Backend: Handler Cleanup erweitern *(erledigt)*
4. [ ] Backend: Unit Tests schreiben
5. [x] Frontend: Type-Definitionen aktualisieren *(erledigt)*
6. [x] Frontend: Helper-Funktionen erweitern *(erledigt)*
7. [x] Frontend: Edit Dialog anpassen *(erledigt)*
8. [x] Frontend: Display Components aktualisieren *(erledigt)*
9. [ ] Integration Tests durchführen
10. [ ] Code Review

### Implementierungsprotokoll

| Datum | Schritt | Status | Notizen |
|-------|---------|--------|---------|
| 2025-12-11 | Backend Enum-Werte | ✅ | action.py, mapping_action_models.py, consts.py |
| 2025-12-11 | _augment_copy_links | ✅ | mapping_actions_engine.py |
| 2025-12-11 | Handler Cleanup | ✅ | mapping.py |
| 2025-12-11 | fill_allowed_actions | ✅ | data/mapping.py |
| 2025-12-11 | _ACTIONTYPE_TO_LEGACY | ✅ | data/mapping.py |
| 2025-12-11 | CopyRecommender | ✅ | copy_recommender.py |
| 2025-12-11 | _INHERITABLE_ACTIONS | ✅ | mapping_actions_engine.py |
| 2025-12-11 | results_html.py | ✅ | CSS_CLASS Mapping |
| 2025-12-11 | Migration | ✅ | manual_entries_migration.py |
| 2025-12-11 | Frontend Types | ✅ | mapping.model.ts, mapping-evaluation.model.ts |
| 2025-12-11 | Frontend Helpers | ✅ | mapping-detail-helpers.ts |
| 2025-12-11 | Action Selection | ✅ | action-selection.component.ts, .css |
| 2025-12-11 | Edit Dialog | ✅ | edit-property-action-dialog.component.ts, .css |
| 2025-12-11 | Action Display | ✅ | mapping-action-display.component.ts, .css |
| 2025-12-11 | Action Statistics | ✅ | mapping-action-statistics.component.ts, .css |
| 2025-12-11 | Mapping Tree | ✅ | mapping-tree.util.ts |
| 2025-12-11 | Mapping Detail | ✅ | mapping-detail.component.ts, .css |
| 2025-12-11 | Tree Table CSS | ✅ | tree-table.component.css |
| 2025-12-11 | Mapping List CSS | ✅ | mapping-list.component.css |

---

## 11. Referenzen

### Backend-Dateien
- `service/src/structure_comparer/action.py` - Action Enum
- `service/src/structure_comparer/model/mapping_action_models.py` - ActionType Enum
- `service/src/structure_comparer/mapping_actions_engine.py` - Partner-Ableitung
- `service/src/structure_comparer/handler/mapping.py` - Field Handler
- `service/src/structure_comparer/consts.py` - Konstanten
- `service/src/structure_comparer/data/mapping.py` - fill_allowed_actions
- `service/src/structure_comparer/recommendations/copy_recommender.py` - Recommendations

### Frontend-Dateien
- `src/app/models/mapping.model.ts` - MappingAction Type
- `src/app/models/mapping-evaluation.model.ts` - ActionType Type
- `src/app/mapping-detail/mapping-detail-helpers.ts` - Helper-Funktionen
- `src/app/edit-property-action-dialog/edit-property-action-dialog.component.ts` - Edit Dialog
- `src/app/shared/mapping-action-display/mapping-action-display.component.ts` - Action Display
- `src/app/shared/mapping-action-statistics/mapping-action-statistics.component.ts` - Statistics

### Ähnliche Spezifikationen
- `docs/specs/Renaming_actions-spec.md` - Umbenennung von copy_from → copy_value_from
