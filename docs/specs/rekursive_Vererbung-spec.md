# Rekursive Profil-Auflösung für Transformation Source Fields

## Übersicht

Dieses Feature ermöglicht die automatische, rekursive Auflösung von FHIR-Profil-Referenzen in Transformation-Quellfeldern. Wenn ein Profil (z.B. `KBV_PR_ERP_Bundle`) Referenzen auf andere StructureDefinitions enthält, werden diese automatisch aufgelöst und deren Felder rekursiv eingebunden.

**Unterstützte Referenz-Typen:**
1. **`type[].profile[]`** - Profil-Constraints auf Ressourcen-Typen (primärer Mechanismus)
2. **`fixedUri` / `fixedCanonical`** - Feste Werte die auf Profile verweisen

## Problemstellung

### Ausgangssituation
- FHIR Bundle-Profile enthalten Entry-Slices mit `.resource`-Feldern
- Diese Felder haben **`type[].profile[]`** Constraints, die auf spezifische Profile verweisen
- Beispiel aus `KBV_PR_ERP_Bundle`:
  ```json
  {
    "id": "Bundle.entry:VerordnungArzneimittel.resource",
    "type": [
      {
        "code": "MedicationRequest",
        "profile": [
          "https://fhir.kbv.de/StructureDefinition/KBV_PR_ERP_Prescription|1.3"
        ]
      }
    ]
  }
  ```
- Das referenzierte Profil `KBV_PR_ERP_Prescription` enthält das Feld `authoredOn`

### Bisheriges Verhalten (fehlerhaft)
- Nur `fixedUri`/`fixedCanonical` Referenzen wurden aufgelöst
- **`type[].profile[]` Referenzen wurden ignoriert!**
- Felder wie `entry:VerordnungArzneimittel.resource.authoredOn` waren nicht verfügbar
- Benutzer sahen nur die Entry-Struktur, nicht die enthaltenen Ressourcen-Felder

### Gewünschtes Verhalten
- **Primär:** Automatische Erkennung von `type[].profile[]` Referenzen auf `.resource`-Feldern
- **Sekundär:** Erkennung von `fixedUri`/`fixedCanonical` Referenzen
- Rekursive Auflösung aller StructureDefinition-Referenzen
- Einbindung der referenzierten Profil-Felder mit vollständigem Pfad
- Beispiel: `Bundle.entry:VerordnungArzneimittel.resource` → lädt `KBV_PR_ERP_Prescription` → erzeugt `Bundle.entry:VerordnungArzneimittel.resource.authoredOn`

## Implementierung

### Backend-Komponenten

#### 1. Neues Model (`model/profile.py`)

```python
class ResolvedProfileField(ProfileField):
    """Extended profile field with resolved reference information."""
    full_path: str                          # z.B. "Bundle.entry:Medication.resource.code"
    source_profile_id: str                  # Das Profil, aus dem das Feld stammt
    source_profile_key: str | None = None   # Profil-Key (url|version)
    unresolved_reference: str | None = None # URL falls nicht auflösbar
    is_resource_field: bool = False         # True für .resource Entry-Felder

class ResolvedProfileFieldsResponse(BaseModel):
    """Response containing recursively resolved profile fields."""
    resource_fields: list[ResolvedProfileField]  # Entry-Point-Felder
    value_fields: list[ResolvedProfileField]     # Alle anderen Felder
    unresolved_references: list[str] = []        # Nicht aufgelöste URLs
```

#### 2. Neue Handler-Methode (`handler/package.py`)

```python
def get_resolved_profile_fields(
    self, proj_key: str, profile_ids: list[str]
) -> ResolvedProfileFieldsResponse:
    """
    Lädt Profile und löst Profil-Referenzen rekursiv auf.
    
    1. Baut Lookup-Maps für alle Profile (nach ID und URL)
    2. Iteriert über angeforderte Profile
    3. Für .resource-Felder: Prüft type[].profile[] auf Profil-URLs
    4. Für andere Felder: Prüft fixedUri/fixedCanonical
    5. Folgt rekursiv allen StructureDefinition-Referenzen
    6. Kategorisiert Felder in resource_fields und value_fields
    7. Sammelt nicht auflösbare Referenzen
    """
```

**Hilfsmethoden:**
- `_extract_root_resource_type()`: Extrahiert Resource-Typ aus Profil-ID
- `_is_non_recursive_reference()`: Prüft auf NamingSystem, CodeSystem, etc.
- `_resolve_profile_by_url()`: Löst URL zu Profil auf (direkt, ohne Version, partieller Match)
- `_load_fields_recursive()`: Rekursive Feld-Ladung mit Zyklus-Erkennung
- **`_get_type_profile_urls()`**: NEU - Extrahiert Profile-URLs aus `type[].profile[]`

#### 3. Neuer API-Endpunkt (`serve.py`)

```
POST /project/{project_key}/profile/resolve-fields
Content-Type: application/json
Body: ["profile-id-1", "profile-id-2", ...]

Response: ResolvedProfileFieldsResponse
```

### Frontend-Komponenten

#### 1. Neues Model (`models/profile.model.ts`)

```typescript
export interface ResolvedProfileField extends ProfileField {
  full_path: string;
  source_profile_id: string;
  source_profile_key?: string | null;
  unresolved_reference?: string | null;
  is_resource_field: boolean;
}

export interface ResolvedProfileFieldsResponse {
  resource_fields: ResolvedProfileField[];
  value_fields: ResolvedProfileField[];
  unresolved_references: string[];
}
```

#### 2. Neue Service-Methode (`project.service.ts`)

```typescript
getResolvedProfileFields(
  projectKey: string, 
  profileIds: string[]
): Observable<ResolvedProfileFieldsResponse>
```

#### 3. Vereinfachte Component (`transformation-detail.component.ts`)

```typescript
private async loadSourceProfileFields(): Promise<void> {
  // Nutzt neuen Backend-Endpunkt statt vieler einzelner API-Calls
  const response = await this.projectService
    .getResolvedProfileFields(this.projectKey, profileIds)
    .toPromise();
  
  // Konvertiert Response zu SourceFieldOption-Format
  // ...
}

// Legacy-Fallback für Kompatibilität
private async loadSourceProfileFieldsLegacy(): Promise<void> { ... }
```

## Nicht-rekursive Referenz-Typen

Folgende FHIR-Typen haben keine Felder und werden von der Rekursion ausgeschlossen:

- NamingSystem
- CodeSystem
- ValueSet
- ConceptMap
- SearchParameter
- OperationDefinition
- CapabilityStatement
- ImplementationGuide

## Test-Ergebnis

### Aktueller Stand (unvollständig)
```bash
curl -X POST ".../profile/resolve-fields" -d '["KBV-PR-ERP-Bundle"]'

# Aktuelles Ergebnis:
# - Resource fields: 13 (die .resource Entry-Felder)
# - Value fields: 434 (nur Bundle-eigene Felder)
# - FEHLT: Felder aus referenzierten Profilen wie KBV_PR_ERP_Prescription
```

### Erwartetes Ergebnis (nach Fix)
```bash
curl -X POST ".../profile/resolve-fields" -d '["KBV-PR-ERP-Bundle"]'

# Erwartetes Ergebnis:
# - Resource fields: 13 (die .resource Entry-Felder)
# - Value fields: ~800+ (inkl. Felder aus referenzierten Profilen)
# - Enthält: Bundle.entry:VerordnungArzneimittel.resource.authoredOn
# - Enthält: Bundle.entry:VerordnungArzneimittel.resource.status
# - Enthält: Bundle.entry:VerordnungArzneimittel.resource.medication[x]
# - etc.
```

## Architektur-Vorteile

| Aspekt | Vorher (Frontend) | Nachher (Backend) |
|--------|-------------------|-------------------|
| API-Calls | Viele einzelne Profile-Requests | Ein POST-Request |
| Logik-Ort | Verteilt im Frontend | Zentralisiert im Backend |
| Performance | Sequentielle Requests | Direkter Dateizugriff |
| Code-Menge | ~200 Zeilen Frontend | ~150 Zeilen Backend |
| Wiederverwendbarkeit | Nur in dieser Component | Für alle Clients verfügbar |

---

## Nächste Schritte

### Phase 0: Kritischer Bug-Fix (Priorität: KRITISCH) ✅ ERLEDIGT

**Problem:** `type[].profile[]` Referenzen werden nicht aufgelöst!

- [x] **Backend: `_load_fields_recursive()` erweitern**
  - Für `.resource`-Felder: Prüfe `type[].profile[]` Array
  - Extrahiere Profil-URLs aus dem profile-Array
  - Löse referenziertes Profil auf und lade dessen Felder rekursiv
  
- [x] **Neue Property: `type_profiles` in `ProfileField`**
  ```python
  @property
  def type_profiles(self) -> list[str]:
      """Gibt die in den Element-Typen definierten profile URLs zurück (type[].profile[])."""
      profiles: list[str] = []
      types = getattr(self.__data, "type", None) or []
      for t in types:
          type_profiles = getattr(t, "profile", None) or []
          for p in type_profiles:
              if p and p not in profiles:
                  profiles.append(p)
      return profiles
  ```

- [x] **Datenmodel erweitert**
  - `ProfileFieldModel` um `type_profiles: list[str] | None = None` erweitert
  - `ProfileField.to_model()` gibt `type_profiles` zurück

- [x] **Test-Case für konkreten Fall**
  ```python
  def test_type_profiles_resolution(self, handler):
      """Test recursive resolution of type[].profile[] references (Phase 0 fix)."""
      # Given: Bundle with entry that has type_profiles on .resource field
      # When: get_resolved_profile_fields(["KBV-PR-ERP-Bundle"])
      # Then: Felder aus KBV_PR_ERP_Prescription sind enthalten
      #       z.B. "entry:VerordnungArzneimittel.resource.authoredOn"
  ```

### Phase 1: Stabilisierung (Priorität: Hoch)

- [x] **Unit-Tests für Backend**
  - Test für `get_resolved_profile_fields()` mit verschiedenen Szenarien
  - Test für zyklische Referenzen (Rekursions-Abbruch)
  - Test für nicht auflösbare Referenzen
  - Test für leere/fehlende Profile

- [ ] **Integration-Tests für Frontend**
  - Test dass `loadSourceProfileFields()` korrekt funktioniert
  - Test des Fallback-Verhaltens bei Backend-Fehler
  - E2E-Test der Transformation-Detail-Ansicht

### Phase 2: UI-Verbesserungen (Priorität: Mittel)

- [x] **Unresolved References anzeigen**
  - Warning-Banner wenn `unresolved_references` nicht leer ist
  - Tooltip mit Liste der nicht aufgelösten URLs
  - Optional: Link zur manuellen Profil-Suche

- [x] **Loading-Indikator**
  - Spinner während Backend-Aufruf
  - Fortschrittsanzeige für große Profile

- [x] **Caching**
  - Frontend-Cache für aufgelöste Felder pro Transformation
  - Cache-Invalidierung bei Profil-Änderungen (TTL: 5 Minuten)

### Phase 3: Erweiterungen (Priorität: Niedrig)

- [ ] **Pfad-Filter im Backend**
  - Optional: Nur bestimmte Pfad-Muster laden
  - Reduziert Datenmenge bei großen Profilen

- [ ] **Profil-Visualisierung**
  - Baum-Ansicht der aufgelösten Profilhierarchie
  - Zeigt welche Profile woher referenziert werden

- [ ] **Export-Funktion**
  - Export der aufgelösten Feldhierarchie als JSON/CSV
  - Dokumentation der Profile-Abhängigkeiten

### Phase 4: Optimierungen (Priorität: Niedrig)

- [ ] **Backend-Caching**
  - Redis/Memory-Cache für häufig angefragte Profile
  - TTL basierend auf Paket-Änderungen

- [ ] **Lazy Loading**
  - Felder erst bei Bedarf nachladen
  - Pagination für sehr große Feldlisten

- [ ] **Parallel Processing**
  - Mehrere Profile parallel verarbeiten
  - Asyncio für I/O-bound Operationen

---

## Bekannte Einschränkungen

1. **Nur StructureDefinition-Referenzen**: NamingSystem, CodeSystem etc. werden nicht rekursiv geladen (by design)

2. **Profil muss im Projekt existieren**: Externe Referenzen auf Profile außerhalb des Projekts können nicht aufgelöst werden

3. **Keine Cross-Package-Auflösung**: Referenzen zwischen Paketen funktionieren nur, wenn beide Pakete im Projekt geladen sind

4. **Zyklische Referenzen**: Werden durch `visited`-Set abgefangen, aber nicht explizit gemeldet

5. ~~**type[].profile[] wird nicht unterstützt**~~: ✅ **BEHOBEN** (Phase 0, 2025-12-09)

---

## Technische Details: type[].profile[] Auflösung

### Wo sind die Daten?

Die `type[].profile[]` Information ist in der **Original-StructureDefinition JSON** gespeichert:

```json
// KBV_PR_ERP_Bundle.json -> snapshot.element[]
{
  "id": "Bundle.entry:VerordnungArzneimittel.resource",
  "path": "Bundle.entry.resource",
  "type": [
    {
      "code": "MedicationRequest",
      "profile": [
        "https://fhir.kbv.de/StructureDefinition/KBV_PR_ERP_Prescription|1.3"
      ]
    }
  ]
}
```

### Aktuelles ProfileField Model

```python
class ProfileField(BaseModel):
    min: int
    max: str
    must_support: bool
    types: list[str] | None = None      # Nur der "code" wird gespeichert!
    ref_types: list[str] | None = None
    fixed_value: Any | None = None
    fixed_value_type: str | None = None
    # FEHLT: type_profiles: list[str] | None = None
```

### Lösungsoptionen

**Option A: Model erweitern**
```python
class ProfileField(BaseModel):
    # ... existing fields ...
    type_profiles: list[str] | None = None  # NEU: profile URLs aus type[]
```
- Vorteil: Saubere API
- Nachteil: Erfordert Änderung beim Profil-Parsing

**Option B: Raw JSON Zugriff**
```python
def _get_type_profiles_from_raw(self, profile: Profile, field_id: str) -> list[str]:
    """Liest type[].profile[] direkt aus der StructureDefinition JSON."""
    # Zugriff auf das Original-JSON der StructureDefinition
```
- Vorteil: Keine Model-Änderung
- Nachteil: Zusätzlicher I/O, komplexerer Code

**Empfehlung: Option A** - Das Model sollte alle relevanten Daten enthalten.

---

## Implementierungsplan für Phase 0

### Schritt 1: Analyse des Profil-Parsings
- [ ] Finde wo Profile aus JSON geladen werden (`data/profile.py`?)
- [ ] Prüfe wie `types` befüllt wird
- [ ] Identifiziere wo `type[].profile[]` verloren geht

### Schritt 2: Model erweitern
- [ ] `ProfileField` um `type_profiles: list[str] | None = None` erweitern
- [ ] Parser anpassen um `type[].profile[]` zu extrahieren

### Schritt 3: Rekursive Auflösung implementieren
- [ ] In `_load_fields_recursive()`: Für `.resource`-Felder `type_profiles` prüfen
- [ ] Profil-URL auflösen und rekursiv laden
- [ ] Pfad korrekt zusammenbauen (z.B. `Bundle.entry:VerordnungArzneimittel.resource.authoredOn`)

### Schritt 4: Testen
- [ ] Unit-Test für `type_profiles` Extraktion
- [ ] Integration-Test mit KBV-PR-ERP-Bundle
- [x] Prüfen dass `authoredOn` als Quellfeld verfügbar ist

---

## Änderungs-Log

| Datum | Änderung |
|-------|----------|
| 2025-12-09 | Initial-Implementierung: Backend-Endpunkt, Frontend-Integration |
| 2025-12-09 | Phase 1+2: Backend Unit-Tests, Warning-Banner für unresolved references, Loading-Indikator, Frontend-Caching |
| 2025-12-09 | **BUG identifiziert**: `type[].profile[]` wird nicht aufgelöst - Spec aktualisiert mit Phase 0 |
| 2025-12-09 | **Phase 0 ERLEDIGT**: `type_profiles` Property in ProfileField, `_load_fields_recursive()` erweitert für type[].profile[] Auflösung |
