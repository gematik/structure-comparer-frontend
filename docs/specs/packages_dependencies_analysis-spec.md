# Package Dependencies Analyse - Spezifikation

## Übersicht

Dieses Feature ermöglicht die **rekursive Analyse von Package-Abhängigkeiten** innerhalb eines Projekts. Es parsed die `dependencies` aus den `package.json` Dateien aller Packages und identifiziert fehlende Dependencies, die nicht im Projekt vorhanden sind.

**Ziel:** Benutzer sollen eine klare Warnung erhalten, wenn Packages referenziert werden, die nicht im Projekt geladen sind - sowohl direkte als auch transitive (rekursive) Abhängigkeiten.

## Problemstellung

### Ausgangssituation

FHIR-Packages haben Abhängigkeiten zu anderen Packages, die in der `package.json` deklariert sind:

```json
// kbv.ita.erp#1.3.2/package/package.json
{
  "name": "kbv.ita.erp",
  "version": "1.3.2",
  "dependencies": {
    "hl7.fhir.r4.core": "4.0.1",
    "kbv.basis": "1.7.0",
    "kbv.ita.for": "1.2.0"
  }
}
```

Diese Dependencies können wiederum eigene Dependencies haben (transitive Abhängigkeiten):

```json
// kbv.ita.for#1.2.0/package/package.json
{
  "name": "kbv.ita.for",
  "version": "1.2.0",
  "dependencies": {
    "hl7.fhir.r4.core": "4.0.1",
    "kbv.basis": "1.7.0"
  }
}
```

### Aktuelles Verhalten (fehlend)

- Package-Dependencies werden **nicht analysiert**
- Benutzer erfahren erst zur Laufzeit oder bei Mapping-Fehlern, dass Packages fehlen
- Es gibt keine Übersicht über den Abhängigkeitsbaum eines Projekts
- Transitive Abhängigkeiten sind komplett intransparent

### Gewünschtes Verhalten

1. **Automatische Analyse** aller geladenen Packages beim Projekt-Laden
2. **Rekursive Auflösung** der Dependency-Kette
3. **Warnung bei fehlenden Packages** - direkt und transitiv
4. **Dependency-Graph-Visualisierung** (optional)
5. **Versions-Matching** - Warnung bei Version-Mismatches

---

## Datenmodell

### Package-Dependency Struktur

```typescript
// Frontend: models/package-dependency.model.ts
export interface PackageDependency {
  name: string;           // z.B. "kbv.basis"
  version: string;        // z.B. "1.7.0"
  packageKey: string;     // z.B. "kbv.basis#1.7.0"
}

export interface PackageDependencyInfo {
  packageKey: string;                    // z.B. "kbv.ita.erp#1.3.2"
  packageName: string;                   // z.B. "kbv.ita.erp"
  packageVersion: string;                // z.B. "1.3.2"
  directDependencies: PackageDependency[];
  allDependencies: PackageDependency[];  // inkl. transitive
}

export interface MissingDependency {
  packageKey: string;                    // Fehlendes Package z.B. "kbv.basis#1.7.0"
  requiredBy: string[];                  // Packages die es benötigen
  isDirectDependency: boolean;           // true = direkt, false = transitiv
}

export interface DependencyAnalysisResult {
  packages: PackageDependencyInfo[];
  missingDependencies: MissingDependency[];
  versionMismatches: VersionMismatch[];
  analysisTimestamp: string;
}

export interface VersionMismatch {
  packageName: string;                   // z.B. "kbv.basis"
  requiredVersions: VersionRequirement[];
  availableVersion: string | null;       // null = nicht vorhanden
}

export interface VersionRequirement {
  version: string;
  requiredBy: string;                    // Package das diese Version benötigt
}
```

### Backend Models

```python
# Backend: model/package_dependency.py
from pydantic import BaseModel

class PackageDependency(BaseModel):
    """Eine einzelne Package-Abhängigkeit."""
    name: str
    version: str
    package_key: str  # name#version

class PackageDependencyInfo(BaseModel):
    """Dependency-Information für ein Package."""
    package_key: str
    package_name: str
    package_version: str
    direct_dependencies: list[PackageDependency]
    all_dependencies: list[PackageDependency]  # inkl. transitive

class MissingDependency(BaseModel):
    """Ein fehlendes Package."""
    package_key: str
    required_by: list[str]
    is_direct_dependency: bool

class VersionMismatch(BaseModel):
    """Version-Konflikt für ein Package."""
    package_name: str
    required_versions: list[dict]  # [{version, required_by}]
    available_version: str | None

class DependencyAnalysisResult(BaseModel):
    """Ergebnis der Dependency-Analyse."""
    packages: list[PackageDependencyInfo]
    missing_dependencies: list[MissingDependency]
    version_mismatches: list[VersionMismatch]
    analysis_timestamp: str
```

---

## API-Endpunkte

### 1. Dependency-Analyse abrufen

```
GET /project/{project_key}/dependencies/analyze

Response: DependencyAnalysisResult
```

### 2. Dependencies für einzelnes Package

```
GET /project/{project_key}/package/{package_id}/dependencies

Response: PackageDependencyInfo
```

---

## Implementierungsplan

### Phase 1: Backend - Model & PackageInfo erweitern ✅ ERLEDIGT

**Ziel:** `PackageInfo` Model um `dependencies` erweitern und aus `package.json` laden.

- [x] **1.1 Model erweitern** (`model/package.py`)
  ```python
  class PackageInfo(BaseModel):
      name: str
      version: str
      title: str | None = None
      description: str | None = None
      canonical: str | None = None
      url: str | None = None
      dependencies: dict[str, str] | None = None  # NEU: {"kbv.basis": "1.7.0"}
  ```

- [x] **1.2 Verifizieren** dass `PackageInfo.model_validate_json()` die dependencies korrekt parsed
  - Test mit einer echten `package.json` die dependencies enthält

- [x] **1.3 Unit-Test schreiben**
  ```python
  def test_package_info_with_dependencies():
      json_data = '''
      {
        "name": "test.package",
        "version": "1.0.0",
        "dependencies": {
          "dep.one": "1.0.0",
          "dep.two": "2.0.0"
        }
      }
      '''
      info = PackageInfo.model_validate_json(json_data)
      assert info.dependencies == {"dep.one": "1.0.0", "dep.two": "2.0.0"}
  ```

**Abnahmekriterium:** `PackageInfo.dependencies` ist korrekt befüllt nach dem Laden.

---

### Phase 2: Backend - Dependency-Analyse-Logik ✅ ERLEDIGT

**Ziel:** Rekursive Analyse der Dependencies implementieren.

- [x] **2.1 Neue Handler-Klasse** (`handler/dependency.py`)
  ```python
  class DependencyHandler:
      def __init__(self, project: Project):
          self.project = project
          self._package_lookup: dict[str, Package] = {}
          
      def analyze_dependencies(self) -> DependencyAnalysisResult:
          """Analysiert alle Package-Dependencies rekursiv."""
          pass
          
      def _build_package_lookup(self) -> None:
          """Baut Lookup-Map für schnellen Package-Zugriff."""
          pass
          
      def _resolve_dependencies_recursive(
          self, 
          package: Package,
          visited: set[str],
          path: list[str]
      ) -> list[PackageDependency]:
          """Löst Dependencies rekursiv auf mit Zyklus-Erkennung."""
          pass
          
      def _find_missing_dependencies(
          self,
          all_required: dict[str, set[str]]  # package_key -> required_by
      ) -> list[MissingDependency]:
          """Identifiziert fehlende Packages."""
          pass
          
      def _detect_version_mismatches(
          self,
          version_requirements: dict[str, list[tuple[str, str]]]
      ) -> list[VersionMismatch]:
          """Erkennt Version-Konflikte."""
          pass
  ```

- [x] **2.2 Rekursions-Logik implementieren**
  - Zyklus-Erkennung via `visited` Set
  - Pfad-Tracking für Debug-Zwecke
  - Max-Depth Limit (z.B. 20) als Sicherheit

- [x] **2.3 Missing-Dependencies ermitteln**
  - Package existiert nicht im Projekt
  - Package existiert, aber falsche Version

- [x] **2.4 Version-Mismatch Detection**
  - Gleiches Package wird mit verschiedenen Versionen benötigt
  - Vorhandene Version stimmt nicht mit Requirements überein

- [x] **2.5 Unit-Tests**
  ```python
  class TestDependencyHandler:
      def test_simple_dependency_chain(self):
          """A -> B -> C: Alle transitiven Dependencies werden gefunden."""
          pass
          
      def test_circular_dependency_detection(self):
          """A -> B -> A: Zyklus wird erkannt und abgebrochen."""
          pass
          
      def test_missing_dependency_detected(self):
          """A -> B (fehlt): Fehlende Dependency wird gemeldet."""
          pass
          
      def test_version_mismatch_detected(self):
          """A -> B@1.0, C -> B@2.0: Mismatch wird gemeldet."""
          pass
  ```

**Abnahmekriterium:** Handler kann rekursiv Dependencies analysieren und Probleme identifizieren.

---

### Phase 3: Backend - API-Endpunkt ✅ ERLEDIGT

**Ziel:** REST-Endpunkt für Dependency-Analyse bereitstellen.

- [x] **3.1 Endpunkt in `serve.py` hinzufügen**
  ```python
  @app.get("/project/{project_key}/dependencies/analyze")
  async def analyze_dependencies(project_key: str) -> DependencyAnalysisResult:
      """Analysiert Package-Dependencies für ein Projekt."""
      project = load_project(project_key)
      handler = DependencyHandler(project)
      return handler.analyze_dependencies()
  ```

- [x] **3.2 OpenAPI-Dokumentation**
  - Response-Schema dokumentieren
  - Beispiel-Responses hinzufügen

- [ ] **3.3 Integration-Test**
  ```python
  def test_analyze_dependencies_endpoint(client):
      response = client.get("/project/test-project/dependencies/analyze")
      assert response.status_code == 200
      result = response.json()
      assert "packages" in result
      assert "missing_dependencies" in result
  ```

**Abnahmekriterium:** API-Endpunkt ist aufrufbar und liefert korrekte Analyse-Ergebnisse.

---

### Phase 4: Frontend - Model & Service ✅ ERLEDIGT

**Ziel:** TypeScript-Models und Service-Methode implementieren.

- [x] **4.1 Model erstellen** (`models/package-dependency.model.ts`)
  - Alle Interfaces wie oben definiert

- [x] **4.2 Service-Methode** (`project.service.ts` oder neuer `dependency.service.ts`)
  ```typescript
  analyzeDependencies(projectKey: string): Observable<DependencyAnalysisResult> {
    const encodedProjectKey = encodeURIComponent(projectKey);
    return this.http.get<DependencyAnalysisResult>(
      `${this.baseUrl}/project/${encodedProjectKey}/dependencies/analyze`
    ).pipe(catchError(this.handleError));
  }
  ```

- [ ] **4.3 Unit-Test für Service**
  ```typescript
  it('should call analyze dependencies endpoint', () => {
    service.analyzeDependencies('test-project').subscribe();
    const req = httpMock.expectOne('/project/test-project/dependencies/analyze');
    expect(req.request.method).toBe('GET');
  });
  ```

**Abnahmekriterium:** Service kann Dependency-Analyse vom Backend abrufen.

---

### Phase 5: Frontend - Warning-Banner ✅ ERLEDIGT

**Ziel:** Warnung bei fehlenden Dependencies in der Projekt-Ansicht anzeigen.

- [x] **5.1 Warning-Component erstellen** (`shared/dependency-warning/dependency-warning.component.ts`)
  ```typescript
  @Component({
    selector: 'app-dependency-warning',
    template: `
      <mat-card *ngIf="missingDependencies.length > 0" class="warning-card">
        <mat-card-header>
          <mat-icon color="warn">warning</mat-icon>
          <mat-card-title>Fehlende Package-Dependencies</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Folgende Packages werden benötigt, sind aber nicht im Projekt vorhanden:</p>
          <ul>
            <li *ngFor="let dep of missingDependencies">
              <strong>{{ dep.packageKey }}</strong>
              <span class="required-by">
                (benötigt von: {{ dep.requiredBy.join(', ') }})
              </span>
              <mat-chip *ngIf="!dep.isDirectDependency" color="accent">
                transitiv
              </mat-chip>
            </li>
          </ul>
        </mat-card-content>
      </mat-card>
    `
  })
  export class DependencyWarningComponent {
    @Input() missingDependencies: MissingDependency[] = [];
  }
  ```

- [x] **5.2 In Edit-Project-Component einbinden**
  - Dependency-Analyse beim Laden des Projekts ausführen
  - Warning-Banner über der Package-Liste anzeigen

- [x] **5.3 Styling**
  - Warning-Card mit gelber/oranger Hintergrundfarbe
  - Icon für bessere Sichtbarkeit
  - Unterscheidung direkte vs. transitive Dependencies

**Abnahmekriterium:** Benutzer sehen eine klare Warnung bei fehlenden Dependencies.

---

### Phase 6: Frontend - Version-Mismatch-Warnung ✅ ERLEDIGT (in Phase 5 integriert)

**Ziel:** Warnung bei Version-Konflikten anzeigen.

- [x] **6.1 Version-Mismatch in Warning-Component**
  ```typescript
  <mat-expansion-panel *ngIf="versionMismatches.length > 0">
    <mat-expansion-panel-header>
      <mat-panel-title>
        <mat-icon color="accent">sync_problem</mat-icon>
        Version-Konflikte ({{ versionMismatches.length }})
      </mat-panel-title>
    </mat-expansion-panel-header>
    <mat-list>
      <mat-list-item *ngFor="let mismatch of versionMismatches">
        <strong>{{ mismatch.packageName }}</strong>
        <div class="version-details">
          <div>Vorhanden: {{ mismatch.availableVersion || 'nicht geladen' }}</div>
          <div>Benötigt:</div>
          <ul>
            <li *ngFor="let req of mismatch.requiredVersions">
              {{ req.version }} (von {{ req.requiredBy }})
            </li>
          </ul>
        </div>
      </mat-list-item>
    </mat-list>
  </mat-expansion-panel>
  ```

- [x] **6.2 Severity-Unterscheidung**
  - **Error** (rot): Package komplett fehlt
  - **Warning** (orange): Version stimmt nicht überein
  - **Info** (blau): Transitive Dependency fehlt

**Abnahmekriterium:** Version-Konflikte werden klar angezeigt.

---

### Phase 7: Dependency-Graph Visualisierung (Optional) ⬜ OFFEN

**Ziel:** Optionale grafische Darstellung des Dependency-Baums.

- [ ] **7.1 Graph-Datenstruktur**
  ```typescript
  interface DependencyGraphNode {
    id: string;           // package_key
    label: string;        // package_name
    status: 'loaded' | 'missing' | 'version-mismatch';
  }
  
  interface DependencyGraphEdge {
    source: string;       // package_key
    target: string;       // dependency package_key
    type: 'direct' | 'transitive';
  }
  ```

- [ ] **7.2 Graph-Component** (z.B. mit D3.js oder ngx-graph)
  - Knoten = Packages
  - Kanten = Dependencies
  - Farben = Status (grün=OK, rot=fehlt, gelb=Version-Problem)

- [ ] **7.3 Dialog für Graph-Anzeige**
  - Button "Dependency-Graph anzeigen"
  - Modal mit interaktiver Graph-Visualisierung

**Abnahmekriterium:** Benutzer können den Dependency-Baum visuell explorieren.

---

### Phase 8: Package-Download aus FHIR-Registries ✅ ERLEDIGT

**Ziel:** Fehlende Packages automatisch von FHIR-Registries herunterladen.

- [x] **8.1 Backend: Download-Modelle** (`model/package.py`)
  ```python
  class PackageDownloadRequest(BaseModel):
      package_name: str
      version: str

  class PackageDownloadResult(BaseModel):
      success: bool
      package_key: str
      message: str
      registry_url: str | None = None
      package: Package | None = None

  class BatchDownloadRequest(BaseModel):
      packages: list[PackageDownloadRequest]

  class BatchDownloadResult(BaseModel):
      total_requested: int
      successful: int
      failed: int
      results: list[PackageDownloadResult]
  ```

- [x] **8.2 Backend: Download-Handler** (`handler/package.py`)
  - Konstante `FHIR_REGISTRIES` mit Registry-URLs:
    - `https://packages.fhir.org`
    - `https://packages2.fhir.org`
    - `https://packages.simplifier.net`
  - `download_from_registry()`: Download von einzelnem Package
  - `_download_from_single_registry()`: Interner Download mit Validierung
  - `download_multiple_from_registry()`: Batch-Download
  - Validierung: Snapshots müssen vorhanden sein
  - Entpacken: .tgz → Package-Verzeichnis

- [x] **8.3 Backend: Error-Handling** (`errors.py`)
  ```python
  class PackageDownloadFailed(Exception): ...
  class PackageNotFoundInRegistry(Exception): ...
  ```

- [x] **8.4 Backend: API-Endpunkte** (`serve.py`)
  ```python
  @app.post("/project/{project_key}/package/download")
  async def download_package_from_registry(...)

  @app.post("/project/{project_key}/package/download-batch")
  async def download_packages_batch(...)
  ```

- [x] **8.5 Frontend: Download-Modelle** (`models/package-dependency.model.ts`)
  ```typescript
  export interface PackageDownloadRequest { ... }
  export interface PackageDownloadResult { ... }
  export interface BatchDownloadRequest { ... }
  export interface BatchDownloadResult { ... }
  ```

- [x] **8.6 Frontend: Service-Methoden** (`project.service.ts`)
  ```typescript
  downloadPackage(projectKey: string, packageName: string, version: string)
  downloadPackages(projectKey: string, packages: PackageDownloadRequest[])
  ```

- [x] **8.7 Frontend: Download-UI** (`dependency-warning.component`)
  - "Alle herunterladen" Button für Batch-Download
  - Download-Icon für einzelne Packages
  - Loading-Spinner während Download
  - Snackbar-Feedback nach Download
  - Automatischer Projekt-Reload nach erfolgreichem Download

- [x] **8.8 Frontend: Projekt-Reload** (`edit-project.component`)
  - `onPackagesDownloaded()` Methode für Event-Handling
  - Automatischer Reload der Projektdaten nach Package-Download

**Abnahmekriterium:** Benutzer können fehlende Packages per Klick aus FHIR-Registries herunterladen.

---

## Beispiel-Szenario

### Projekt: dgMP Mapping_2025-10

**Geladene Packages:**
- `kbv.ita.erp#1.3.2`
- `kbv.ita.for#1.2.0`
- `de.gematik.epa.medication#1.0.6-2`
- `de.gematik.erezept-workflow.r4#1.5.2`
- `de.gematik.fhir.directory#0.11.25`

**Dependency-Analyse:**

```
kbv.ita.erp#1.3.2
├── hl7.fhir.r4.core@4.0.1    ❌ FEHLT
├── kbv.basis@1.7.0           ❌ FEHLT
└── kbv.ita.for@1.2.0         ✅ vorhanden
    ├── hl7.fhir.r4.core@4.0.1    ❌ FEHLT (transitiv)
    └── kbv.basis@1.7.0           ❌ FEHLT (transitiv)

de.gematik.epa.medication#1.0.6-2
├── hl7.fhir.r4.core@4.0.1              ❌ FEHLT
├── hl7.terminology.r4@6.3.0            ❌ FEHLT
├── hl7.fhir.uv.extensions.r4@5.2.0     ❌ FEHLT
├── de.basisprofil.r4@1.5.2             ❌ FEHLT
└── de.gematik.fhir.directory@0.11.25   ✅ vorhanden
```

**Erwartetes Analyse-Ergebnis:**

```json
{
  "packages": [...],
  "missing_dependencies": [
    {
      "package_key": "hl7.fhir.r4.core#4.0.1",
      "required_by": ["kbv.ita.erp#1.3.2", "kbv.ita.for#1.2.0", "de.gematik.epa.medication#1.0.6-2"],
      "is_direct_dependency": true
    },
    {
      "package_key": "kbv.basis#1.7.0",
      "required_by": ["kbv.ita.erp#1.3.2", "kbv.ita.for#1.2.0"],
      "is_direct_dependency": true
    },
    {
      "package_key": "hl7.terminology.r4#6.3.0",
      "required_by": ["de.gematik.epa.medication#1.0.6-2"],
      "is_direct_dependency": true
    }
  ],
  "version_mismatches": [],
  "analysis_timestamp": "2025-12-09T10:30:00Z"
}
```

---

## Bekannte Einschränkungen

1. **Basis-Packages werden oft nicht geladen**: `hl7.fhir.r4.core` ist in fast allen Projekten eine Dependency, wird aber selten explizit geladen - könnte zu vielen Warnungen führen.

2. **Version-Matching ist exakt**: `kbv.basis@1.7.0` matched nicht `kbv.basis@1.7.1` - SemVer-Ranges werden nicht unterstützt.

3. **Externe Packages**: Packages die nicht im Projekt-Verzeichnis liegen, können nicht analysiert werden.

4. **Optionale Dependencies**: FHIR `package.json` kann auch `devDependencies` oder optionale Dependencies haben - diese werden (vorerst) nicht berücksichtigt.

---

## Konfigurationsoptionen (Zukünftig)

```yaml
# project.yaml - mögliche Erweiterungen
dependency_analysis:
  enabled: true
  ignore_packages:
    - "hl7.fhir.r4.core"  # Basis-Package nicht prüfen
    - "hl7.terminology.r4"
  strict_version_matching: false  # true = exakt, false = Major.Minor muss stimmen
  show_transitive: true
```

---

## Änderungs-Log

| Datum | Phase | Änderung | Status |
|-------|-------|----------|--------|
| 2025-12-09 | - | Initiale Spezifikation erstellt | ✅ ERLEDIGT |
| 2025-12-09 | Phase 1 | Backend: `PackageInfo.dependencies` zu `model/package.py` hinzugefügt | ✅ ERLEDIGT |
| 2025-12-09 | Phase 2 | Backend: `DependencyHandler` in `handler/dependency.py` mit rekursiver Analyse, Zyklus-Erkennung, Missing-Detection, Version-Mismatch-Detection | ✅ ERLEDIGT |
| 2025-12-09 | Phase 2 | Backend: Unit-Tests in `tests/test_dependency_handler.py` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 3 | Backend: API-Endpunkte `/dependencies/analyze` und `/package/{id}/dependencies` in `serve.py` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 4 | Frontend: Models in `models/package-dependency.model.ts` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 4 | Frontend: Service-Methoden `analyzeDependencies()` und `getPackageDependencies()` in `project.service.ts` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 5 | Frontend: `DependencyWarningComponent` in `shared/dependency-warning/` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 5 | Frontend: Integration in `edit-project.component` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 6 | Frontend Version-Mismatch UI (bereits in Phase 5 integriert) | ✅ ERLEDIGT |
| 2025-12-09 | Phase 7 | Dependency-Graph Visualisierung (Optional) | ⬜ OFFEN |
| 2025-12-09 | Phase 8 | Backend: Download-Modelle in `model/package.py` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 8 | Backend: Download-Handler in `handler/package.py` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 8 | Backend: Error-Klassen in `errors.py` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 8 | Backend: API-Endpunkte `/package/download` und `/package/download-batch` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 8 | Frontend: Download-Modelle und Service-Methoden | ✅ ERLEDIGT |
| 2025-12-09 | Phase 8 | Frontend: Download-UI in `DependencyWarningComponent` | ✅ ERLEDIGT |
| 2025-12-09 | Phase 8 | Frontend: Projekt-Reload nach Download | ✅ ERLEDIGT |

