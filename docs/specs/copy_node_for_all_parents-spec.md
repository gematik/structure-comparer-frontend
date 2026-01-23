# Spezifikation: copy_node_to/copy_node_from für alle Elternfelder

## Übersicht

Diese Spezifikation beschreibt die Änderungen, um `copy_node_to` und `copy_node_from` Actions für **alle Elternfelder** (Felder mit Kindern) anzubieten, unabhängig vom Kompatibilitätsstatus der Kinder.

## Aktueller Zustand

### Problem

Aktuell werden `copy_node_to` und `copy_node_from` nur angeboten, wenn **alle Nachkommen** entweder:
- `compatible` sind, ODER
- bereits `solved` sind (durch manuelle Action)

Dies schränkt die Nutzbarkeit ein, da die Actions gerade bei teilweise inkompatiblen Strukturen nützlich wären.

### Betroffener Code

**Datei:** `service/src/structure_comparer/mapping_actions_engine.py`

```python
# Zeilen 525-539 - Aktuelle Einschränkung
# For copy_node_to/copy_node_from: check if all descendants are compatible or solved
all_children_ok = all_descendants_compatible_or_solved(
    field_name, fields, evaluation_map, None
)

if not all_children_ok:
    if Action.COPY_NODE_TO in field.actions_allowed:
        field.actions_allowed.remove(Action.COPY_NODE_TO)
    if Action.COPY_NODE_FROM in field.actions_allowed:
        field.actions_allowed.remove(Action.COPY_NODE_FROM)
```

---

## Neue Anforderungen

### 1. Verfügbarkeit der Actions

| Bedingung | copy_node_to/copy_node_from verfügbar? |
|-----------|----------------------------------------|
| Feld hat Kinder (ist Elternfeld) | ✅ Ja |
| Feld hat keine Kinder (Leaf-Feld) | ❌ Nein |
| Feld hat bereits eine andere Action | ❌ Nein (nicht in `actions_allowed`) |
| Kinder sind teilweise inkompatibel | ✅ Ja (NEU!) |
| Kein Source-Profil vorhanden | ❌ Nein für `copy_node_from` |
| Kein Target-Profil vorhanden | ❌ Nein für `copy_node_to` |

### 2. Vererbung bei Anwendung

Wenn ein Benutzer `copy_node_to` oder `copy_node_from` auf ein Elternfeld anwendet:

| Kind-Typ | Verhalten |
|----------|-----------|
| **Kompatible Kinder** | Erben die Action als `inherited_from` Parent |
| **Inkompatible Kinder** | Bleiben auf `needs_action` - Benutzer muss manuell entscheiden |
| **Kinder mit manueller Action** | Behalten ihre manuelle Action (kein Überschreiben) |

### 3. Anzeige und Status

| Feld | Status nach copy_node_* |
|------|-------------------------|
| Parent-Feld | `solved` (durch manuelle Action) |
| Kompatibles Kind | `solved` (durch vererbte Action) |
| Inkompatibles Kind | `needs_action` (muss manuell gelöst werden) |

---

## Technische Implementierung

### Phase 1: Backend - Actions Allowed anpassen

#### 1.1 Einschränkung entfernen

**Datei:** `service/src/structure_comparer/mapping_actions_engine.py`

**Änderung:** Block in `adjust_use_recursive_actions_allowed()` entfernen (Zeilen 525-539)

```python
# ENTFERNEN:
# For copy_node_to/copy_node_from: check if all descendants are compatible or solved
# (without considering manual actions - copy_node should only be allowed if ALL children can be copied)
all_children_ok = all_descendants_compatible_or_solved(
    field_name, fields, evaluation_map, None  # None = don't exclude manual actions
)

if not all_children_ok:
    # Some descendants are incompatible and not solved: remove copy_node actions
    if Action.COPY_NODE_TO in field.actions_allowed:
        field.actions_allowed.remove(Action.COPY_NODE_TO)
    if Action.COPY_NODE_FROM in field.actions_allowed:
        field.actions_allowed.remove(Action.COPY_NODE_FROM)
```

#### 1.2 Leaf-Felder ausschließen

**Datei:** `service/src/structure_comparer/data/mapping.py`

**Änderung:** In `fill_allowed_actions()` am Ende hinzufügen:

```python
def fill_allowed_actions(self, source_profiles: List[str], target_profile: str, all_fields: Dict[str, 'MappingField'] = None):
    """Set baseline actions_allowed based on source/target presence.
    
    Args:
        source_profiles: List of source profile keys
        target_profile: Target profile key
        all_fields: Optional dict of all fields for hierarchy check
    """
    allowed = set([c for c in Action])

    any_source_present = any(
        [self.profiles[profile] is not None for profile in source_profiles]
    )
    target_present = self.profiles[target_profile] is not None

    if not any_source_present:
        allowed -= set([
            Action.USE, Action.NOT_USE,
            Action.COPY_VALUE_FROM, Action.COPY_NODE_FROM
        ])
    else:
        allowed -= set([Action.EMPTY])
    if not target_present:
        allowed -= set([
            Action.USE, Action.EMPTY,
            Action.COPY_VALUE_TO, Action.COPY_NODE_TO
        ])

    # NEU: copy_node_* nur für Elternfelder (nicht Leaf-Felder)
    if all_fields is not None:
        from ..field_hierarchy import FieldHierarchyNavigator
        navigator = FieldHierarchyNavigator(all_fields)
        descendants = navigator.get_all_descendants(self.name)
        if not descendants:
            # Leaf-Feld: copy_node nicht sinnvoll
            allowed -= set([Action.COPY_NODE_TO, Action.COPY_NODE_FROM])

    self.actions_allowed = list(allowed)
```

**Datei:** `service/src/structure_comparer/data/mapping.py`

**Änderung:** Aufruf in `_fill_fields()` anpassen (ca. Zeile 238):

```python
# ALT:
field.fill_allowed_actions(all_profiles_keys[:-1], all_profiles_keys[-1])

# NEU:
field.fill_allowed_actions(all_profiles_keys[:-1], all_profiles_keys[-1], self.fields)
```

---

### Phase 2: Backend - Vererbung nur für kompatible Kinder

#### 2.1 Vererbungslogik anpassen

**Datei:** `service/src/structure_comparer/mapping_actions_engine.py`

**Änderung:** In `_inherit_or_default()` (ca. Zeilen 233-243):

```python
# ALT:
if is_copy_action:
    # Skip inheritance for copy and extension actions, fall through to default
    pass

# NEU:
if is_copy_action:
    # For copy_node_to/copy_node_from: Only inherit if field is compatible
    is_copy_node_action = parent_info.action in {
        ActionType.COPY_NODE_TO,
        ActionType.COPY_NODE_FROM,
    }
    
    if is_copy_node_action:
        # Check if this field is compatible
        classification = getattr(field, "classification", "unknown") if field else "unknown"
        if str(classification).lower() == "compatible":
            # Compatible field: inherit the copy_node action
            return ActionInfo(
                action=parent_info.action,
                source=ActionSource.INHERITED,
                inherited_from=field_parent_name,
                auto_generated=True,
                system_remark=f"Inherited from {field_parent_name}",
                other_value=parent_info.other_value,
            )
        else:
            # Incompatible field: do NOT inherit, fall through to default
            # Field remains needs_action
            pass
    else:
        # Other copy actions (copy_value_*): existing behavior (recommendations)
        pass
```

#### 2.2 Recommendations für kompatible Kinder generieren

**Datei:** `service/src/structure_comparer/recommendations/copy_recommender.py`

**Änderung:** Sicherstellen, dass Recommendations für kompatible Kinder unter copy_node_* Parent generiert werden:

```python
def _generate_copy_node_child_recommendations(
    self,
    field_name: str,
    field,
    parent_action: ActionType,
    parent_other: str,
) -> List[Recommendation]:
    """Generate recommendations for children of copy_node_* parent fields.
    
    Only compatible children should get recommendations.
    """
    recommendations = []
    
    classification = getattr(field, "classification", "unknown")
    if str(classification).lower() != "compatible":
        # Incompatible field: no recommendation
        return recommendations
    
    # Generate recommendation with same action as parent
    recommendations.append(Recommendation(
        action=parent_action,
        priority=RecommendationPriority.HIGH,
        reason=f"Inherited from parent copy_node action",
        other_value=parent_other,
    ))
    
    return recommendations
```

---

### Phase 3: Handler - apply_all_children_recommendations anpassen

**Datei:** `service/src/structure_comparer/handler/mapping.py`

**Änderung:** In `apply_all_children_recommendations()` nur kompatible Kinder verarbeiten:

```python
def apply_all_children_recommendations(
    self,
    project_key: str,
    mapping_id: str,
    parent_field_name: str,
) -> List[MappingFieldModel]:
    """Apply all recommendations for compatible children of a parent field.
    
    Only processes children that are:
    - Compatible (classification == "compatible")
    - Have recommendations
    - Don't already have a manual action
    
    Incompatible children are skipped and remain as "needs_action".
    """
    # ... existing setup code ...
    
    for field_name in all_descendants:
        field = fields.get(field_name)
        if not field:
            continue
        
        # NEU: Nur kompatible Kinder verarbeiten
        classification = getattr(field, "classification", "unknown")
        if str(classification).lower() != "compatible":
            # Skip incompatible fields - they remain needs_action
            continue
        
        # Check if field already has manual action
        existing_entry = manual_entries.entries.get(field_name)
        if existing_entry and existing_entry.action:
            # Don't override existing manual action
            continue
        
        # Check if field has recommendations
        if not hasattr(field, 'recommendations') or not field.recommendations:
            continue
        
        # ... rest of existing logic ...
```

---

## Frontend-Änderungen

### ✅ Implementiert: Kinder-Statistiken und Warnungen

**Datei:** `src/app/edit-property-action-dialog/edit-property-action-dialog.component.ts`

Neue Methoden hinzugefügt:
- `getChildFields()`: Ermittelt alle Kinder des aktuellen Feldes
- `getCompatibleChildrenCount()`: Anzahl kompatibler Kinder
- `getIncompatibleChildrenCount()`: Anzahl inkompatibler Kinder
- `getTotalChildrenCount()`: Gesamtanzahl der Kinder
- `hasIncompatibleChildren()`: Prüft ob inkompatible Kinder existieren

**Datei:** `src/app/edit-property-action-dialog/edit-property-action-dialog.component.html`

UI-Änderungen:
- Statistik-Anzeige mit Anzahl kompatibler/inkompatibler Kinder
- Grünes Häkchen-Icon für kompatible Kinder mit Hinweis "(werden automatisch übernommen)"
- Rotes Fehler-Icon für inkompatible Kinder mit Hinweis "(müssen manuell bearbeitet werden)"
- Gelbe Warnung wenn inkompatible Kinder existieren
- Checkbox ist nicht mehr disabled (immer nutzbar für Elternfelder)

**Datei:** `src/app/edit-property-action-dialog/edit-property-action-dialog.component.css`

Neue CSS-Klassen:
- `.children-statistics`: Container für die Statistik-Anzeige
- `.stat-row`: Zeile für eine Statistik
- `.stat-icon.compatible`: Grünes Icon
- `.stat-icon.incompatible`: Rotes Icon
- `.stat-hint`: Grauer Hinweistext

---

## Testfälle

### Unit Tests

| Test | Beschreibung | Erwartetes Ergebnis |
|------|--------------|---------------------|
| `test_copy_node_available_for_parent_with_incompatible_children` | Parent mit incompatible Kindern | `copy_node_to` in `actions_allowed` |
| `test_copy_node_not_available_for_leaf_fields` | Leaf-Feld | `copy_node_to` NICHT in `actions_allowed` |
| `test_copy_node_inheritance_only_compatible` | Parent mit copy_node_to, mixed Kinder | Nur compatible erben Action |
| `test_incompatible_children_remain_needs_action` | Incompatible Kind nach Parent-Action | Status bleibt `needs_action` |
| `test_apply_children_skips_incompatible` | `apply_all_children_recommendations` | Nur compatible werden aktualisiert |

### Integration Tests

| Test | Beschreibung |
|------|--------------|
| `test_copy_node_workflow_mixed_children` | Vollständiger Workflow mit gemischten Kindern |
| `test_evaluation_after_copy_node` | Evaluation zeigt korrekte Status nach copy_node |

---

## Migrations-/Kompatibilitätshinweise

### Rückwärtskompatibilität

- ✅ Bestehende Mappings bleiben unverändert
- ✅ Bereits gesetzte Actions werden nicht überschrieben
- ⚠️ `actions_allowed` wird bei Neuberechnung erweitert (mehr Actions verfügbar)

### API-Kompatibilität

- ✅ Keine Breaking Changes in der API
- ✅ Response-Format bleibt identisch

---

## Zusammenfassung der Änderungen

| Datei | Änderungstyp | Beschreibung | Status |
|-------|--------------|--------------|--------|
| `mapping_actions_engine.py` | Entfernen | Block Zeilen 525-539 (Einschränkung) | ✅ Erledigt |
| `mapping_actions_engine.py` | Ändern | `_inherit_or_default()` - copy_node nur für compatible | ✅ Erledigt |
| `data/mapping.py` | Ändern | `fill_allowed_actions()` - Leaf-Felder ausschließen | ✅ Erledigt |
| `data/mapping.py` | Ändern | `_gen_fields()` - all_fields Parameter übergeben | ✅ Erledigt |
| `handler/mapping.py` | Ändern | `apply_all_children_recommendations()` - nur compatible | ✅ Erledigt |
| `copy_recommender.py` | Optional | Recommendations für copy_node Kinder | ⏭️ Nicht erforderlich |
| `test_extension_inheritance.py` | Anpassen | Test für neues Vererbungsverhalten | ✅ Erledigt |
| `edit-property-action-dialog.component.ts` | Hinzufügen | Methoden für Kinder-Statistiken | ✅ Erledigt |
| `edit-property-action-dialog.component.html` | Ändern | Statistik-Anzeige und Warnungen | ✅ Erledigt |
| `edit-property-action-dialog.component.css` | Hinzufügen | CSS für Statistik-Anzeige | ✅ Erledigt |

---

## Implementierungsstatus

### ✅ Abgeschlossen (2025-12-15)

**Backend-Änderungen:**
1. `mapping_actions_engine.py`: Einschränkung für `copy_node_to`/`copy_node_from` entfernt
2. `mapping_actions_engine.py`: Vererbung nur für kompatible Kinder implementiert
3. `data/mapping.py`: Leaf-Felder von `copy_node_*` ausgeschlossen
4. `handler/mapping.py`: `apply_all_children_recommendations()` filtert inkompatible Kinder

**Tests:**
- 317 Tests bestanden
- `test_extension_inheritance.py` angepasst für neues Verhalten

---

## Offene Punkte

- [x] Soll in der UI angezeigt werden, wie viele Kinder kompatibel vs. inkompatibel sind? ✅ Implementiert
- [x] Soll eine Warnung erscheinen, wenn inkompatible Kinder existieren? ✅ Implementiert
- [ ] Performance-Optimierung bei großen Hierarchien? (Noch nicht erforderlich)

---

## Referenzen

- [copy_node_from_integration-spec.md](./copy_node_from_integration-spec.md) - Ursprüngliche Integration
- [recursive_mapping_properties_table-spec.md](./recursive_mapping_properties_table-spec.md) - Rekursive Vererbung

---

*Erstellt: 2025-12-15*
*Status: ✅ Implementiert*
