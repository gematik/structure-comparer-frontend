# Mapping Actions & Status – Analyse (Stand: 19. November 2025)

## 1. Überblick

### Beteiligte Komponenten

**Frontend (Angular):**
- `MappingDetailComponent` - Hauptkomponente für Mapping-Darstellung
- `MappingService` - API-Kommunikation für Mappings
- `ComparisonService` - Evaluation und Enhanced-Logik
- Helper-Module in `mapping-detail-helpers.ts` - Status-, Mapping-Text- und Evaluations-Logik

**Backend (Python/FastAPI):**
- `serve.py` - API-Endpoints
- `MappingHandler` - Mapping-Geschäftslogik
- `MappingEvaluator` - Enhanced Evaluation-Engine
- Datenmodelle für Actions, Evaluations und Mappings

### Datenfluss-Überblick

1. **Frontend** lädt Mapping über `GET /project/{project_key}/mapping/{mapping_id}`
2. **Frontend** lädt Enhanced-Evaluation über `GET /project/{project_key}/mapping/{mapping_id}/evaluation`
3. **Status-Berechnung** erfolgt im Frontend durch Helper-Funktionen basierend auf `original_classification` + `action`
4. **Mapping-Text** wird im Frontend durch Helper generiert
5. **Action-Updates** erfolgen über `POST /project/{project_key}/mapping/{mapping_id}/field/{field_name}`

## 2. Frontend-Flow

### 2.1 Relevante Dateien & Komponenten

- `src/app/mapping-detail/mapping-detail.component.ts` - Hauptkomponente
- `src/app/mapping-detail/mapping-detail-helpers.ts` - Helper-Funktionen für Status, Text, Evaluation
- `src/app/mappings.service.ts` - Mapping-API-Calls
- `src/app/comparison.service.ts` - Evaluation-API-Calls und Enhanced-Beschreibungen
- `src/app/models/mapping.model.ts` - Mapping-Datenmodelle
- `src/app/models/mapping-evaluation.model.ts` - Evaluation-Datenmodelle

### 2.2 API-Calls aus dem Frontend

| Endpoint | Methode | Zweck | Service |
|----------|---------|-------|---------|
| `/project/{projectKey}/mapping/{mappingId}` | GET | Mapping-Daten laden | MappingsService.getMapping() |
| `/project/{projectKey}/mapping/{mappingId}/field` | GET | Verfügbare Felder laden | MappingsService.getMappingFields() |
| `/project/{projectKey}/mapping/{mappingId}/evaluation` | GET | Enhanced Evaluation laden | ComparisonService.getMappingEvaluation() |
| `/project/{projectKey}/mapping/{mappingId}/field/{fieldName}` | POST | Field-Action aktualisieren | MappingsService.updateMappingFieldAction() |
| `/action` | GET | Verfügbare Actions laden | MappingsService.getActions() |

### 2.3 Statusberechnung im Frontend

**Status-Logic in `StatusHelper.getProcessingStatus()`:**

```typescript
// Mit Enhanced Evaluation (bevorzugt):
if (original_classification === 'compatible' || original_classification === 'warning') {
    return 'completed';
} else if (original_classification === 'incompatible' && action !== 'use') {
    return 'resolved';
} else if (original_classification === 'incompatible' && action === 'use') {
    return 'needs_action';
}

// Fallback ohne Evaluation:
switch (field.classification) {
    case 'compatible': case 'warning':
        return field.action && field.action !== 'use' ? 'resolved' : 'completed';
    case 'incompatible':
        return field.action && field.action !== 'use' ? 'resolved' : 'needs_action';
}
```

**Status-Konfiguration in `STATUS_CONFIG`:**
- `completed`: Label "Kompatibel", CSS-Class `status-completed`
- `resolved`: Label "Gelöst", CSS-Class `status-resolved`
- `needs_action`: Label "Aktion erforderlich", CSS-Class `status-needs-action`

### 2.4 Mapping-Spalte im UI

**Text-Generierung durch `MappingTextHelper.getConsolidatedMappingText()`:**

| Action | Mapping-Text |
|--------|-------------|
| `copy_from` | "Aus \"{targetField}\" kopieren" |
| `copy_to` | "In \"{targetField}\" kopieren" |
| `fixed` | "Fixer Wert: \"{fixedValue}\"" |
| `manual` | "Manuelle Anpassung erforderlich" + Hinweis |
| `extension` | "Als Extension verwenden" + Details |
| `not_use` | "Nicht verwenden" |
| `empty` | "Leer lassen" |
| `use` | "Direkt verwenden" |
| `other` | "Andere Behandlung" |
| `medication_service` | "Medication Service" |

**Empfehlungen werden angezeigt:**
- Bei Enhanced Evaluation: Über `field.evaluation.recommendations`
- Mit zusätzlichen UI-Controls für detaillierte Recommendations (`showDetailedRecommendations`)

## 3. Backend-Flow

### 3.1 Relevante Endpoints

| Endpoint | Methode | Zweck | Handler |
|----------|---------|-------|---------|
| `/project/{project_key}/mapping/{mapping_id}` | GET | Mapping-Details abrufen | MappingHandler.get() |
| `/project/{project_key}/mapping/{mapping_id}/field` | GET | Mapping-Felder auflisten | MappingHandler.get_field_list() |
| `/project/{project_key}/mapping/{mapping_id}/field/{field_name}` | GET | Einzelnes Feld abrufen | MappingHandler.get_field() |
| `/project/{project_key}/mapping/{mapping_id}/field/{field_name}` | POST | Feld-Action aktualisieren | MappingHandler.set_field() |
| `/project/{project_key}/mapping/{mapping_id}/evaluation` | GET | Enhanced Evaluation | serve.get_mapping_evaluation() |
| `/project/{project_key}/mapping/{mapping_id}/evaluation/summary` | GET | Evaluation Summary | serve.get_mapping_evaluation_summary() |
| `/action` | GET | Verfügbare Actions | ProjectsHandler.get_action_options() |

### 3.2 Datenmodelle / Schemas

**Wichtige Felder für Actions:**
```python
class Action(StrEnum):
    USE = "use"
    NOT_USE = "not_use"
    EMPTY = "empty"
    EXTENSION = "extension"
    MANUAL = "manual"
    COPY_FROM = "copy_from"
    COPY_TO = "copy_to"
    FIXED = "fixed"
    MEDICATION_SERVICE = "medication_service"
```

**MappingField Struktur:**
- `name`: Feldname
- `action`: Aktuelle Action (siehe Action enum)
- `classification`: Original-Klassifikation (compatible/warning/incompatible)
- `profiles`: Profil-spezifische Informationen (Kardinalitäten, etc.)
- `other`: Zielfeld bei copy_from/copy_to
- `fixed`: Fixer Wert bei fixed action
- `remark`: Bemerkungstext

**Enhanced Evaluation Struktur:**
- `FieldEvaluationModel`: Erweiterte Feldbewertung mit `enhanced_classification`, `issues`, `warnings`, `recommendations`
- `MappingEvaluationModel`: Gesamte Mapping-Bewertung mit `field_evaluations` und `summary`

### 3.3 Evaluation-Logik

**Zentral in `MappingEvaluator`:**

1. **Original Classification**: Aus Comparison-Algorithmus (`compatible`, `warning`, `incompatible`)
2. **Enhanced Classification**: Berücksichtigt Actions:
   - `COMPATIBLE`: Direkt kompatible Felder
   - `WARNING`: Felder mit Warnungen
   - `INCOMPATIBLE`: Inkompatible Felder ohne Lösung
   - `ACTION_RESOLVED`: Durch Action gelöste Inkompatibilitäten (copy_from, fixed, etc.)
   - `ACTION_MITIGATED`: Teilweise gelöste Felder (manual, extension) - benötigen Aufmerksamkeit

3. **Action-Bewertung**: Spezifische Logik pro Action:
   - `USE`: Prüft Kardinalitäts-Kompatibilität
   - `EXTENSION`: Löst fehlende Zielfelder
   - `COPY_FROM/COPY_TO`: Prüft Existenz von Quell-/Zielfeldern
   - `FIXED`: Prüft ob fixer Wert gesetzt
   - `MANUAL/MEDICATION_SERVICE`: Erfordert Aufmerksamkeit

### 3.4 Statusbezug im Backend

**Derzeit keine explizite Status-Ableitung im Backend**, aber Enhanced Classification ermöglicht Frontend-Status-Berechnung:

- Enhanced Classification wird in Evaluation-Response geliefert
- Frontend nutzt diese für präzisere Status-Bestimmung
- Status-Logik ist noch Frontend-spezifisch implementiert

## 4. Spezieller Fokus: Status „Aktion erforderlich" (`needs_action`)

### 4.1 Aktuelle Ermittlung von `needs_action`

**Im Frontend (StatusHelper):**
```typescript
// Mit Enhanced Evaluation:
if (original_classification === 'incompatible' && action === 'use') {
    return 'needs_action';
}

// Fallback:
if (field.classification === 'incompatible' && (!field.action || field.action === 'use')) {
    return 'needs_action';
}
```

**Bedeutung:** Inkompatible Felder, die noch die Default-Action "use" haben und keine Lösung implementiert haben.

### 4.2 Aktuell mögliche Actions bei `needs_action`

Alle Actions sind technisch möglich, da `needs_action` nur ein abgeleiteter Status ist:
- `use` (Default) - führt zu `needs_action`
- `copy_from`, `copy_to`, `fixed`, `extension`, `manual`, etc. - ändern Status zu `resolved`

### 4.3 Backend-Daten für `needs_action` Felder

**Mapping-Response enthält:**
- Original `classification: "incompatible"`
- `action: "use"` (meist Default)
- Profil-Informationen (Kardinalitäten, etc.)

**Enhanced Evaluation liefert:**
- `enhanced_classification: "incompatible"`
- `issues`: Liste von Kompatibilitätsproblemen
- `recommendations`: Vorschläge für Actions
- `warnings`: Zusätzliche Hinweise

### 4.4 Aktuelle Mapping-Spalte für `needs_action`

**Derzeit wird angezeigt:**
- Mapping-Text basierend auf Action ("Direkt verwenden" für `use`)
- PLUS Enhanced Recommendations aus Evaluation
- Benutzer sehen sowohl "unfertiges" Mapping als auch Empfehlungen

## 5. Einschätzung & Ansatzpunkte für Änderungen

### 5.1 Empfohlene Stellen für Backend-Status-Logik

**Option 1: In MappingEvaluator erweitern**
```python
class FieldEvaluation:
    # ... existing fields ...
    processing_status: str  # "completed", "resolved", "needs_action"
    
def evaluate_field(self, field: MappingField, mapping: Mapping) -> FieldEvaluation:
    # ... existing logic ...
    # Add status calculation based on enhanced_classification and action
    processing_status = self._calculate_processing_status(enhanced_classification, field.action)
```

**Option 2: Neue StatusEvaluator-Klasse**
```python
class StatusEvaluator:
    def get_processing_status(self, field: MappingField, evaluation: FieldEvaluation) -> str:
        # Centralized status logic that matches frontend rules
```

**Option 3: Status-Field in Response-Models**
- Erweitere `MappingFieldModel` um `processing_status`
- Berechnung in `MappingHandler.get()` oder per Evaluation

### 5.2 Ansatzpunkt für "needs_action" ohne fertiges Mapping

**Backend-seitige Regel implementieren:**

```python
def should_show_mapping_content(self, field: MappingField, evaluation: FieldEvaluation) -> bool:
    """
    Bestimmt ob für ein Feld der Mapping-Inhalt oder nur Empfehlungen gezeigt werden sollen.
    
    Bei needs_action: Nur Empfehlungen, keine "fertigen" Actions wie fixed, copy_from, etc.
    """
    if evaluation.enhanced_classification == EvaluationResult.INCOMPATIBLE and field.action == Action.USE:
        return False  # Nur Empfehlungen zeigen
    return True  # Normalen Mapping-Inhalt zeigen
```

**Integration in Response:**
- Ergänze `MappingFieldModel` um `show_mapping_content: bool`
- Frontend prüft dieses Flag in `MappingTextHelper`
- Bei `show_mapping_content: false` nur Recommendations anzeigen

### 5.3 Migrations-/Kompatibilitätsaspekte

**Bestehende Datenbestände:**
- Alle existierenden Mappings haben bereits Actions gesetzt
- Migration nicht erforderlich, da nur Anzeigelogik geändert wird
- Bestehende `needs_action`-Felder bleiben funktional gleich

**API-Kompatibilität:**
- Neue Backend-Felder als optional hinzufügen
- Frontend kann graceful degradieren bei fehlendem Backend-Support
- Schrittweise Migration möglich: Backend → Frontend → Cleanup

**Testdaten:**
- Bestehende Projekte können als Testbasis dienen
- `needs_action` Status durch Zurücksetzen von Actions auf `use` erzeugbar

### 5.4 Empfohlenes Vorgehen

1. **Backend erweitern:**
   - `processing_status` in `FieldEvaluationModel` hinzufügen
   - `show_mapping_content` Flag in Response-Models ergänzen
   - Logik in `MappingEvaluator` implementieren

2. **Frontend anpassen:**
   - `MappingTextHelper` um `show_mapping_content`-Prüfung erweitern
   - Bei `needs_action` + `!show_mapping_content`: Nur Recommendations anzeigen
   - Status-Logik optional auf Backend-Response umstellen

3. **Validierung:**
   - Bestehende Mappings auf korrekte Status-Berechnung prüfen
   - Sicherstellen dass `needs_action`-Felder nur noch Recommendations zeigen
   - User Experience testen: Sind Empfehlungen ausreichend verständlich?

Diese Analyse zeigt, dass die Status-Logik derzeit Frontend-seitig implementiert ist, aber die Backend-Evaluation bereits alle benötigten Daten für eine zentrale Status-Berechnung bereitstellt. Die Implementierung der Änderung "needs_action ohne fertiges Mapping" ist durch Ergänzung eines `show_mapping_content`-Flags elegant umsetzbar.