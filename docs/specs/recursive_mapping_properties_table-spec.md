# Spezifikation: Rekursive Auflösung von Profil-Referenzen in der Mapping-Tabelle

## Implementierungsstatus

| Phase | Beschreibung | Status | Datum |
|-------|-------------|--------|-------|
| 1.1 | Backend-Modelle definieren | ✅ Erledigt | 2025-12-11 |
| 1.2 | MappingFieldResolver implementieren | ✅ Erledigt | 2025-12-11 |
| 1.3 | Handler erweitern | ✅ Erledigt | 2025-12-11 |
| 1.4 | API-Endpoint erstellen | ✅ Erledigt | 2025-12-11 |
| 2 | Backend-Tests | ✅ Erledigt | 2025-12-11 |
| 3 | Frontend-Service | ✅ Erledigt | 2025-12-11 |
| 4 | Frontend-UI | ✅ Erledigt | 2025-12-11 |
| - | Build-Verifizierung | ✅ Erledigt | 2025-12-11 |

### Build-Status
- **Backend**: ✅ Python-Importe erfolgreich getestet
- **Backend-Tests**: ✅ 29 Tests erfolgreich (`test_mapping_field_resolver.py`)
- **Frontend**: ✅ Angular Build erfolgreich (4.91 MB)

### Erstellte/Geänderte Dateien

**Backend:**
- `service/src/structure_comparer/model/mapping.py` - Neue Modelle hinzugefügt:
  - `ProfileResolutionInfo`
  - `ResolvedMappingField`
  - `ResolvedProfileFieldInfo`
  - `UnresolvedReference`
  - `ResolutionStats`
  - `ResolvedMappingFieldsResponse`
- `service/src/structure_comparer/resolver/__init__.py` - Neues Modul
- `service/src/structure_comparer/resolver/mapping_field_resolver.py` - MappingFieldResolver Klasse
- `service/src/structure_comparer/handler/mapping.py` - `get_resolved_fields()` Methode hinzugefügt
- `service/src/structure_comparer/serve.py` - Neuer Endpoint `GET /project/{project_key}/mapping/{mapping_id}/resolved-fields`

**Frontend:**
- `src/app/models/mapping.model.ts` - Neue TypeScript-Interfaces:
  - `ProfileResolutionInfo`
  - `ResolvedProfileFieldInfo`
  - `ResolvedMappingField`
  - `UnresolvedReference`
  - `ResolutionStats`
  - `ResolvedMappingFieldsResponse`
- `src/app/mappings.service.ts` - Neue Methode `getResolvedMappingFields()`
- `src/app/mapping-detail/mapping-detail.component.ts` - Erweitert mit:
  - Properties für resolved fields, stats, loading state
  - Methoden: `toggleResolvedView()`, `loadResolvedFields()`, `onResolutionDepthChange()`, `hasExpandableReferences()`
  - Neue Material-Module importiert
- `src/app/mapping-detail/mapping-detail.component.html` - Erweitert mit:
  - Slide Toggle für "Referenzen auflösen"
  - Dropdown für Max. Tiefe
  - Loading Spinner
  - Warnung für nicht aufgelöste Referenzen
  - Resolution Statistics Anzeige

---

## 1. Übersicht

### 1.1 Hintergrund

In FHIR-Profilen können Felder über `fixedUri`, `fixedCanonical` oder `type[].profile[]` auf andere Profile verweisen. Diese Referenzen sind besonders wichtig bei:

- **Bundle-Profilen**: Enthalten `entry`-Slices, deren `.resource`-Felder auf konkrete Ressourcen-Profile verweisen
- **Extension-Profilen**: Definieren Erweiterungen, die wiederum andere Extensions referenzieren können
- **Komplexe Ressourcen**: Felder mit `Reference`-Typen, die auf spezifische Profile eingeschränkt sind

### 1.2 Aktueller Stand

#### 1.2.1 Transformation-Ansicht (bereits implementiert)

Für die **Transformation-Detail-Ansicht** (Bundle-zu-Bundle Mappings) ist die rekursive Auflösung bereits vollständig implementiert:

**Backend** (`handler/package.py`):
- `get_resolved_profile_fields()` - Lädt Profile rekursiv
- `_load_fields_recursive()` - Folgt `fixedUri`/`fixedCanonical` Referenzen
- Kategorisiert Felder in `resource_fields` und `value_fields`
- Meldet nicht auflösbare Referenzen in `unresolved_references`

**Frontend** (`transformation-detail.component.ts`):
- `loadSourceProfileFields()` - Ruft Backend-Endpoint auf
- `loadProfileFieldsRecursive()` - Fallback für Legacy-Modus
- Caching der aufgelösten Felder

#### 1.2.2 Mapping-Ansicht (noch nicht implementiert)

Die **Mapping-Detail-Ansicht** (Ressource-zu-Ressource Mappings) zeigt aktuell nur:
- Felder des Source-Profils (z.B. `KBV_PR_ERP_Prescription`)
- Felder des Target-Profils (z.B. `EPA_PR_Medication`)

**Problem**: Wenn ein Feld eine Referenz auf ein anderes Profil enthält (z.B. `MedicationRequest.medication.reference` → `Medication`-Profil), werden die Felder des referenzierten Profils NICHT angezeigt.

### 1.3 Ziel

Erweiterung der Mapping-Tabelle, sodass Felder von referenzierten Profilen rekursiv aufgelöst und in der Tabelle angezeigt werden können.

---

## 2. Anforderungsanalyse

### 2.1 Anwendungsfälle

#### Use Case 1: Reference-Felder
Ein `MedicationRequest`-Profil hat ein Feld `medication` vom Typ `Reference(Medication)`. Der Benutzer möchte sehen, wie die Felder des referenzierten `Medication`-Profils zwischen Source und Target gemappt werden.

**Beispiel**:
```
MedicationRequest.medication.reference → Medication-Profil
  Medication.code
  Medication.code.coding
  Medication.code.coding.system
  Medication.code.coding.code
  Medication.code.coding.display
```

#### Use Case 2: Nested Extensions
Ein Profil enthält Extensions, die selbst wieder auf weitere Extension-Profile verweisen.

**Beispiel**:
```
MedicationRequest.extension:dosageFlag.valueBoolean
MedicationRequest.extension:multiplePrescription.extension:kennzeichnung
MedicationRequest.extension:multiplePrescription.extension:nummerierung
```

#### Use Case 3: Contained Resources
Ressourcen, die `contained` verwenden und deren Felder ebenfalls relevant für das Mapping sind.

### 2.2 Unterschiede zu Transformationen

| Aspekt | Transformation | Mapping |
|--------|---------------|---------|
| Kontext | Bundle → Bundle | Ressource → Ressource |
| Profile | Mehrere Source-Profile (Bundle-Entries) | Typischerweise 1 Source, 1 Target |
| Rekursionstiefe | Tief (Bundle → Entry → Ressource → Felder) | Variabel (abhängig von Referenzen) |
| Hauptanwendung | Copy From Dropdown für Values | Kompatibilitäts-Vergleich aller Felder |

### 2.3 Technische Anforderungen

1. **Performance**: Rekursive Auflösung kann viele Profile laden → Caching erforderlich
2. **Zyklus-Erkennung**: Verhinderung von unendlichen Schleifen bei zirkulären Referenzen
3. **Konfigurierbarkeit**: Benutzer soll Rekursionstiefe steuern können
4. **Inkrementelles Laden**: Möglichkeit, referenzierte Profile "on demand" zu laden

---

## 3. Lösungsdesign

### 3.1 Backend-Erweiterungen

#### 3.1.1 Neuer Endpoint: `GET /project/{project_key}/mapping/{mapping_id}/resolved-fields`

**Beschreibung**: Liefert alle Felder eines Mappings mit rekursiv aufgelösten Referenzen.

**Request Parameter**:
```
project_key: string          - Projekt-Schlüssel
mapping_id: string           - Mapping-ID
max_depth: int (optional)    - Maximale Rekursionstiefe (default: 3)
include_references: bool     - Referenzen auflösen (default: true)
```

**Response Model**:
```python
class ResolvedMappingFieldsResponse(BaseModel):
    """Response containing recursively resolved mapping fields."""
    fields: list[ResolvedMappingField]
    unresolved_references: list[UnresolvedReference] = []
    resolution_stats: ResolutionStats


class ResolvedMappingField(BaseModel):
    """Extended mapping field with resolution context."""
    name: str                          # Vollständiger Pfad
    original_name: str                 # Original-Feldname im Profil
    source_profiles: dict[str, ResolvedProfileFieldInfo | None]
    target_profile: ResolvedProfileFieldInfo | None
    classification: ComparisonClassification
    issues: list[ComparisonIssue] | None
    
    # Rekursions-Metadaten
    resolved_from: str | None          # Pfad des Eltern-Felds, falls aufgelöst
    resolution_depth: int              # Tiefe der Auflösung (0 = direktes Feld)
    referenced_profile_url: str | None # URL des referenzierten Profils
    is_expanded: bool = False          # Für Frontend: Ist der Zweig expandiert?


class ResolvedProfileFieldInfo(BaseModel):
    """Profile-specific field information with resolution context."""
    min: int
    max: str
    must_support: bool
    types: list[str] | None
    ref_types: list[str] | None
    type_profiles: list[str] | None    # Profile-URLs für mögliche Auflösung
    cardinality_note: str | None
    fixed_value: Any | None
    fixed_value_type: str | None
    
    # Referenz-Informationen
    can_be_expanded: bool = False      # Hat auflösbare Referenzen?
    resolved_profile_id: str | None    # ID des aufgelösten Profils


class UnresolvedReference(BaseModel):
    """Information about a reference that could not be resolved."""
    field_path: str
    reference_url: str
    reference_type: str  # 'fixedUri', 'fixedCanonical', 'type_profile', 'ref_type'


class ResolutionStats(BaseModel):
    """Statistics about the resolution process."""
    total_fields: int
    resolved_references: int
    unresolved_references: int
    max_depth_reached: int
    profiles_loaded: list[str]
```

#### 3.1.2 Handler-Implementierung

**Datei**: `service/src/structure_comparer/handler/mapping.py`

Neue Methode `get_resolved_mapping_fields()`:

```python
def get_resolved_mapping_fields(
    self,
    project_key: str,
    mapping_id: str,
    max_depth: int = 3,
    include_references: bool = True
) -> ResolvedMappingFieldsResponse:
    """
    Get mapping fields with recursive resolution of profile references.
    
    This method:
    1. Loads the mapping with its source and target profiles
    2. For each field, checks for resolvable references:
       - type[].profile[] for Resource fields
       - type[].targetProfile[] for Reference fields
       - fixedUri/fixedCanonical for constrained fields
    3. Recursively loads and merges fields from referenced profiles
    4. Maintains classification and comparison logic for resolved fields
    5. Reports unresolved references
    
    Args:
        project_key: Project identifier
        mapping_id: Mapping identifier
        max_depth: Maximum recursion depth (default: 3)
        include_references: Whether to resolve references (default: True)
    
    Returns:
        ResolvedMappingFieldsResponse with all fields and resolution metadata
    """
    pass  # Implementation details below
```

#### 3.1.3 Rekursive Auflösungslogik

**Datei**: `service/src/structure_comparer/resolver/mapping_field_resolver.py` (neu)

```python
class MappingFieldResolver:
    """Resolves profile references in mapping fields recursively."""
    
    def __init__(
        self,
        project: Project,
        max_depth: int = 3
    ):
        self.project = project
        self.max_depth = max_depth
        self.visited: set[str] = set()
        self.profile_cache: dict[str, Profile] = {}
        self.unresolved: list[UnresolvedReference] = []
        self.stats = ResolutionStats(...)
    
    def resolve_mapping_fields(
        self,
        mapping: Mapping
    ) -> list[ResolvedMappingField]:
        """Main entry point for resolving all mapping fields."""
        pass
    
    def _resolve_field_references(
        self,
        field: MappingField,
        current_depth: int,
        path_prefix: str
    ) -> list[ResolvedMappingField]:
        """Recursively resolve references for a single field."""
        pass
    
    def _get_resolvable_references(
        self,
        field: MappingField
    ) -> list[tuple[str, str]]:
        """Extract all resolvable profile URLs from a field."""
        # Returns list of (reference_type, profile_url) tuples
        pass
    
    def _resolve_profile_by_url(
        self,
        url: str
    ) -> Profile | None:
        """Resolve a profile URL to a Profile object."""
        pass
    
    def _merge_resolved_fields(
        self,
        parent_field: MappingField,
        child_profile: Profile,
        path_prefix: str,
        depth: int
    ) -> list[ResolvedMappingField]:
        """Merge fields from a resolved profile into the parent context."""
        pass
```

### 3.2 Frontend-Erweiterungen

#### 3.2.1 Service-Erweiterung

**Datei**: `src/app/mappings.service.ts`

```typescript
/**
 * Retrieves mapping fields with recursive resolution of profile references
 * @param projectKey The project identifier
 * @param mappingId The mapping identifier
 * @param maxDepth Maximum recursion depth (default: 3)
 * @param includeReferences Whether to resolve references (default: true)
 * @returns Observable containing the resolved fields response
 */
getResolvedMappingFields(
  projectKey: string,
  mappingId: string,
  maxDepth: number = 3,
  includeReferences: boolean = true
): Observable<ResolvedMappingFieldsResponse> {
  const params = new HttpParams()
    .set('max_depth', maxDepth.toString())
    .set('include_references', includeReferences.toString());
  
  return this.http.get<ResolvedMappingFieldsResponse>(
    `${this.baseUrl}/project/${encodeURIComponent(projectKey)}/mapping/${encodeURIComponent(mappingId)}/resolved-fields`,
    { params }
  ).pipe(catchError(this.handleError));
}
```

#### 3.2.2 Model-Erweiterungen

**Datei**: `src/app/models/mapping.model.ts`

```typescript
/**
 * Extended mapping field with resolution context
 */
export interface ResolvedMappingField extends MappingField {
  // Resolution metadata
  original_name: string;
  resolved_from: string | null;
  resolution_depth: number;
  referenced_profile_url: string | null;
  is_expanded: boolean;
  
  // Profile-specific resolution info
  source_resolution_info?: ProfileResolutionInfo;
  target_resolution_info?: ProfileResolutionInfo;
}

export interface ProfileResolutionInfo {
  can_be_expanded: boolean;
  resolved_profile_id: string | null;
  type_profiles: string[] | null;
}

export interface ResolvedMappingFieldsResponse {
  fields: ResolvedMappingField[];
  unresolved_references: UnresolvedReference[];
  resolution_stats: ResolutionStats;
}

export interface UnresolvedReference {
  field_path: string;
  reference_url: string;
  reference_type: 'fixedUri' | 'fixedCanonical' | 'type_profile' | 'ref_type';
}

export interface ResolutionStats {
  total_fields: number;
  resolved_references: number;
  unresolved_references: number;
  max_depth_reached: number;
  profiles_loaded: string[];
}
```

#### 3.2.3 Komponenten-Erweiterungen

**Datei**: `src/app/mapping-detail/mapping-detail.component.ts`

Neue Funktionalitäten:

```typescript
export class MappingDetailComponent implements OnInit {
  // Neue Properties
  resolvedFields: ResolvedMappingField[] = [];
  unresolvedReferences: UnresolvedReference[] = [];
  resolutionStats: ResolutionStats | null = null;
  isLoadingResolved: boolean = false;
  showResolvedFields: boolean = false;  // Toggle zwischen normal/resolved
  maxResolutionDepth: number = 3;
  
  // Neue Methoden
  
  /**
   * Toggle zwischen normaler und aufgelöster Feldansicht
   */
  toggleResolvedView(): void {
    this.showResolvedFields = !this.showResolvedFields;
    if (this.showResolvedFields && this.resolvedFields.length === 0) {
      this.loadResolvedFields();
    }
  }
  
  /**
   * Lädt Felder mit rekursiver Auflösung
   */
  private loadResolvedFields(): void {
    this.isLoadingResolved = true;
    this.mappingsService.getResolvedMappingFields(
      this.projectKey,
      this.mappingId,
      this.maxResolutionDepth
    ).subscribe({
      next: (response) => {
        this.resolvedFields = response.fields;
        this.unresolvedReferences = response.unresolved_references;
        this.resolutionStats = response.resolution_stats;
        this.isLoadingResolved = false;
      },
      error: (err) => {
        console.error('Error loading resolved fields:', err);
        this.isLoadingResolved = false;
      }
    });
  }
  
  /**
   * Expandiert/Kollabiert einen Referenz-Zweig
   */
  toggleFieldExpansion(field: ResolvedMappingField): void {
    field.is_expanded = !field.is_expanded;
    // Optional: Lazy Loading für tiefere Ebenen
  }
  
  /**
   * Prüft ob ein Feld expandierbare Referenzen hat
   */
  hasExpandableReferences(field: ResolvedMappingField): boolean {
    return field.source_resolution_info?.can_be_expanded ||
           field.target_resolution_info?.can_be_expanded || false;
  }
}
```

#### 3.2.4 UI-Erweiterungen

**Datei**: `src/app/mapping-detail/mapping-detail.component.html`

Neue UI-Elemente:

```html
<!-- Toggle für Resolved View -->
<div class="view-controls">
  <mat-slide-toggle
    [(ngModel)]="showResolvedFields"
    (change)="toggleResolvedView()"
    [disabled]="isLoadingResolved">
    Referenzen auflösen
  </mat-slide-toggle>
  
  <mat-form-field *ngIf="showResolvedFields" class="depth-selector">
    <mat-label>Max. Tiefe</mat-label>
    <mat-select [(ngModel)]="maxResolutionDepth" (selectionChange)="loadResolvedFields()">
      <mat-option [value]="1">1</mat-option>
      <mat-option [value]="2">2</mat-option>
      <mat-option [value]="3">3</mat-option>
      <mat-option [value]="5">5</mat-option>
    </mat-select>
  </mat-form-field>
</div>

<!-- Warnung für unaufgelöste Referenzen -->
<mat-card *ngIf="unresolvedReferences.length > 0" class="warning-card">
  <mat-card-header>
    <mat-icon>warning</mat-icon>
    <mat-card-title>Nicht aufgelöste Referenzen</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <p>Einige Profil-Referenzen konnten nicht aufgelöst werden:</p>
    <ul>
      <li *ngFor="let ref of unresolvedReferences">
        <code>{{ ref.field_path }}</code> → {{ ref.reference_url }}
        <span class="ref-type">({{ ref.reference_type }})</span>
      </li>
    </ul>
  </mat-card-content>
</mat-card>

<!-- Resolution Stats -->
<div *ngIf="resolutionStats" class="resolution-stats">
  <span class="stat">
    <mat-icon>layers</mat-icon>
    {{ resolutionStats.total_fields }} Felder
  </span>
  <span class="stat">
    <mat-icon>link</mat-icon>
    {{ resolutionStats.resolved_references }} aufgelöst
  </span>
  <span class="stat" *ngIf="resolutionStats.unresolved_references > 0">
    <mat-icon>link_off</mat-icon>
    {{ resolutionStats.unresolved_references }} nicht aufgelöst
  </span>
</div>
```

### 3.3 Tree-Table Erweiterungen

Die `TreeTableComponent` muss erweitert werden, um:

1. **Tiefe-Indikation**: Visuelle Kennzeichnung der Auflösungstiefe
2. **Expand/Collapse für Referenzen**: Zusätzlicher Expand-Button für Referenz-Felder
3. **Referenz-Badge**: Anzeige des referenzierten Profils

```typescript
// tree-table.component.ts

export interface TreeTableNode {
  // Existierende Properties...
  
  // Neue Properties für Referenz-Auflösung
  isResolvedFromReference?: boolean;
  resolvedFromPath?: string;
  resolutionDepth?: number;
  referencedProfileUrl?: string;
  canExpand?: boolean;
}
```

---

## 4. Implementierungsplan

### Phase 1: Backend-Grundlagen (2-3 Tage)

1. **Modelle definieren**
   - `ResolvedMappingField` in `model/mapping.py`
   - Response-Modelle für den neuen Endpoint

2. **Resolver implementieren**
   - Neue Datei `resolver/mapping_field_resolver.py`
   - Basis-Logik für rekursive Auflösung
   - Zyklus-Erkennung

3. **Handler erweitern**
   - `get_resolved_mapping_fields()` in `handler/mapping.py`

4. **API-Endpoint**
   - Neuer Endpoint in `serve.py`

### Phase 2: Backend-Tests (1-2 Tage)

1. **Unit Tests**
   - Tests für `MappingFieldResolver`
   - Tests für Zyklus-Erkennung
   - Tests für verschiedene Referenz-Typen

2. **Integration Tests**
   - End-to-End Tests mit realen Profilen

### Phase 3: Frontend-Service (1 Tag)

1. **Service erweitern**
   - Neuer API-Aufruf in `mappings.service.ts`

2. **Modelle definieren**
   - TypeScript-Interfaces

### Phase 4: Frontend-UI (2-3 Tage)

1. **Komponente erweitern**
   - Toggle und Steuerung
   - Lade-Logik

2. **Tree-Table erweitern**
   - Referenz-Badges
   - Tiefe-Indikation

3. **Styling**
   - CSS für neue Elemente

### Phase 5: Integration & Testing (1-2 Tage)

1. **E2E-Tests**
2. **Performance-Tests**
3. **Dokumentation**

---

## 5. Offene Fragen

### 5.1 Design-Entscheidungen

1. **Standard-Verhalten**: Soll die rekursive Auflösung standardmäßig aktiviert sein oder nur auf Anfrage?
   - **Empfehlung**: Standardmäßig deaktiviert, da es Performance-Auswirkungen haben kann

2. **Caching-Strategie**: Wie lange sollen aufgelöste Felder gecached werden?
   - **Empfehlung**: Wie bei Transformationen, 5 Minuten TTL

3. **Lazy Loading**: Sollen tiefere Ebenen erst bei Bedarf geladen werden?
   - **Empfehlung**: Ja, für bessere Performance bei großen Profilen

### 5.2 Edge Cases

1. **Zirkuläre Referenzen**: Profil A referenziert B, B referenziert A
   - **Lösung**: `visited`-Set zur Erkennung, mit Warnung im Frontend

2. **Fehlende Profile**: Referenzierte Profile sind nicht im Projekt geladen
   - **Lösung**: Als `unresolved_reference` melden, nicht als Fehler behandeln

3. **Konflikte bei Source/Target**: Unterschiedliche Profile in Source und Target referenziert
   - **Lösung**: Beide Auflösungspfade getrennt verfolgen und in der UI unterscheidbar machen

---

## 6. Referenzen

### 6.1 Existierende Implementierungen

- **Transformation Resolver**: `handler/package.py` → `get_resolved_profile_fields()`
- **Frontend Legacy Resolver**: `transformation-detail.component.ts` → `loadProfileFieldsRecursive()`

### 6.2 Relevante Dateien

**Backend**:
- `service/src/structure_comparer/data/comparison.py` - Basis für Feld-Vergleiche
- `service/src/structure_comparer/data/mapping.py` - Mapping-Logik
- `service/src/structure_comparer/data/profile.py` - Profil-Feld-Definitionen
- `service/src/structure_comparer/handler/package.py` - Rekursive Auflösung für Transformationen

**Frontend**:
- `src/app/mapping-detail/mapping-detail.component.ts` - Mapping-Detail-Ansicht
- `src/app/transformation-detail/transformation-detail.component.ts` - Referenz-Implementierung
- `src/app/shared/tree-table/tree-table.component.ts` - Tabellen-Komponente
- `src/app/models/mapping.model.ts` - Mapping-Modelle

---

## 7. Glossar

| Begriff | Beschreibung |
|---------|--------------|
| `fixedUri` | FHIR-Element mit festem URI-Wert, oft für Profil-Referenzen |
| `fixedCanonical` | FHIR-Element mit kanonischer URL zu einem anderen Profil |
| `type[].profile[]` | Profil-Einschränkung für einen FHIR-Typ |
| `type[].targetProfile[]` | Ziel-Profile für Reference-Typen |
| `Rekursionstiefe` | Anzahl der Ebenen, die bei der Auflösung verfolgt werden |
| `Resolution` | Prozess der Auflösung einer Profil-Referenz zu konkreten Feldern |
