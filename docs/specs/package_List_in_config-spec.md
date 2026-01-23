# Package-Liste in Config-Datei - Spezifikation

## Änderungshistorie

| Version | Datum       | Autor  | Änderung                     |
|---------|-------------|--------|------------------------------|
| 1.0     | 2025-12-11  | -      | Initiale Spezifikation       |

---

## 1. Motivation & Problemstellung

### Aktueller Zustand (IST)

Beim Systemstart wird der `data`-Ordner eines Projekts gescannt und anhand der vorhandenen Verzeichnisse (Format: `<name>#<version>`) die Liste der Packages zusammengestellt:

```python
# project.py - __load_packages()
def __load_packages(self) -> None:
    # Load packages from config
    self.pkgs = [Package(self.data_dir, self, p) for p in self.config.packages]

    # Check for local packages not in config
    for dir in self.data_dir.iterdir():
        if not dir.is_dir():
            continue
        parsed = self.__safe_parse_pkg_dirname(dir.name)
        if parsed is None:
            continue
        name, version = parsed
        if not self.__has_pkg(name, version):
            # Package hinzufügen wenn nicht in Config
            self.pkgs.append(Package(dir, self))
```

### Probleme mit dem aktuellen Ansatz

1. **Keine deklarative Kontrolle**: Die Package-Liste ergibt sich implizit aus dem Dateisystem
2. **Inkonsistenz**: Packages können existieren ohne in der Config definiert zu sein
3. **Keine Vorplanung möglich**: Man kann keine Packages deklarieren, bevor sie heruntergeladen wurden
4. **Fehlende Metadaten**: `display`-Name und andere Infos gehen verloren wenn nur Ordner vorhanden
5. **Schwer versionierbar**: Git-Commits der Config zeigen nicht die tatsächliche Package-Struktur

### Zielzustand (SOLL)

Die Package-Liste wird **ausschließlich** in der `config.json` gepflegt. Der `data`-Ordner dient nur als **Cache/Storage** für heruntergeladene Packages.

---

## 2. Konzept

### 2.1 Kern-Prinzipien

1. **Config als Single Source of Truth**: Die `config.json` enthält die vollständige, definitive Liste aller benötigten Packages
2. **data-Ordner als Cache**: Der `data`-Ordner enthält nur die tatsächlich heruntergeladenen Package-Dateien
3. **Status-Check statt Auto-Discovery**: System prüft, ob deklarierte Packages vorhanden sind
4. **Lazy Loading**: Packages werden erst bei Bedarf heruntergeladen

### 2.2 Package-Status

Ein Package kann folgende Status haben:

| Status         | Beschreibung                                           |
|----------------|--------------------------------------------------------|
| `available`    | Package ist in Config UND im data-Ordner vorhanden     |
| `missing`      | Package ist in Config, aber NICHT heruntergeladen      |
| `orphaned`     | Package ist im data-Ordner, aber NICHT in Config       |

---

## 3. Datenmodell-Änderungen

### 3.1 PackageConfig (Backend)

**Datei**: `service/src/structure_comparer/data/config.py`

```python
class PackageConfig(BaseModel):
    name: str
    version: str
    display: str | None = None
    # NEU: Optionale Felder für bessere Dokumentation
    description: str | None = None       # Kurzbeschreibung des Packages
    canonical: str | None = None         # Canonical URL (z.B. https://fhir.kbv.de/...)
    source_registry: str | None = None   # Ursprungs-Registry URL
```

### 3.2 Package-Status Model (Backend - NEU)

**Datei**: `service/src/structure_comparer/model/package.py`

```python
class PackageStatus(str, Enum):
    AVAILABLE = "available"     # In Config und heruntergeladen
    MISSING = "missing"         # In Config, nicht heruntergeladen
    ORPHANED = "orphaned"       # Heruntergeladen, nicht in Config

class PackageWithStatus(BaseModel):
    """Extended Package model with download status."""
    display: str | None = None
    id: str
    name: str
    version: str
    status: PackageStatus
    # Optional: Zusätzliche Infos
    description: str | None = None
    canonical: str | None = None
    source_registry: str | None = None
```

### 3.3 PackageList Response (Backend)

```python
class PackageListWithStatus(BaseModel):
    """Package list with status information."""
    packages: list[PackageWithStatus]
    # Statistik
    total: int
    available: int
    missing: int
    orphaned: int
```

### 3.4 Frontend Model

**Datei**: `src/app/models/package.model.ts`

```typescript
export type PackageStatus = 'available' | 'missing' | 'orphaned';

export interface Package {
  id: string;
  display: string;
  name: string;
  version: string;
  status: PackageStatus;
  // Optional
  description?: string;
  canonical?: string;
  source_registry?: string;
}

export interface PackageListResponse {
  packages: Package[];
  total: number;
  available: number;
  missing: number;
  orphaned: number;
}
```

---

## 4. API-Änderungen

### 4.1 GET /project/{project_key}/package

**Änderung**: Response enthält nun `status`-Feld für jedes Package.

**Response**:
```json
{
  "packages": [
    {
      "id": "kbv.ita.erp#1.3.2",
      "name": "kbv.ita.erp",
      "version": "1.3.2",
      "display": "KBV eRezept",
      "status": "available",
      "description": "KBV E-Rezept Profil",
      "canonical": "https://fhir.kbv.de/StructureDefinition/...",
      "source_registry": "https://packages.simplifier.net"
    },
    {
      "id": "kbv.basis#1.7.0",
      "name": "kbv.basis",
      "version": "1.7.0",
      "display": null,
      "status": "missing"
    }
  ],
  "total": 2,
  "available": 1,
  "missing": 1,
  "orphaned": 0
}
```

### 4.2 POST /project/{project_key}/package/add (NEU)

**Zweck**: Package zur Config hinzufügen (ohne Download).

**Request**:
```json
{
  "name": "kbv.basis",
  "version": "1.7.0",
  "display": "KBV Basis Profil"
}
```

**Response**:
```json
{
  "success": true,
  "package": {
    "id": "kbv.basis#1.7.0",
    "name": "kbv.basis",
    "version": "1.7.0",
    "display": "KBV Basis Profil",
    "status": "missing"
  }
}
```

### 4.3 DELETE /project/{project_key}/package/{package_id}/config (NEU)

**Zweck**: Package aus Config entfernen (heruntergeladene Dateien bleiben als `orphaned`).

**Response**:
```json
{
  "success": true,
  "message": "Package removed from config. Files remain in data folder as orphaned."
}
```

### 4.4 DELETE /project/{project_key}/package/{package_id}/files (NEU)

**Zweck**: Heruntergeladene Package-Dateien löschen.

**Response**:
```json
{
  "success": true,
  "message": "Package files deleted from data folder."
}
```

### 4.5 POST /project/{project_key}/package/cleanup-orphaned (NEU)

**Zweck**: Alle `orphaned` Packages (im data-Ordner, aber nicht in Config) löschen.

**Response**:
```json
{
  "success": true,
  "deleted": ["old.package#1.0.0", "unused.pkg#2.1.0"],
  "count": 2
}
```

### 4.6 POST /project/{project_key}/package/adopt-orphaned (NEU)

**Zweck**: Alle `orphaned` Packages in die Config übernehmen.

**Response**:
```json
{
  "success": true,
  "adopted": ["old.package#1.0.0"],
  "count": 1
}
```

---

## 5. Backend-Implementierung

### 5.1 Änderungen in `project.py`

```python
class Project:
    def __load_packages(self) -> None:
        """
        Lädt Packages NUR aus der Config.
        Dateisystem wird nur für Status-Check verwendet.
        """
        self.pkgs = []
        
        for pkg_config in self.config.packages:
            pkg_dir = self.data_dir / f"{pkg_config.name}#{pkg_config.version}"
            
            if pkg_dir.exists() and (pkg_dir / "package" / "package.json").exists():
                # Package ist heruntergeladen
                self.pkgs.append(Package(pkg_dir, self, pkg_config, status="available"))
            else:
                # Package nur in Config, nicht heruntergeladen
                self.pkgs.append(Package.from_config(pkg_config, status="missing"))
    
    def get_orphaned_packages(self) -> list[str]:
        """
        Findet Packages im data-Ordner, die nicht in der Config sind.
        """
        orphaned = []
        config_keys = {f"{p.name}#{p.version}" for p in self.config.packages}
        
        for dir in self.data_dir.iterdir():
            if not dir.is_dir():
                continue
            parsed = self.__safe_parse_pkg_dirname(dir.name)
            if parsed and dir.name not in config_keys:
                orphaned.append(dir.name)
        
        return orphaned
```

### 5.2 Änderungen in `package.py` (Handler)

```python
class PackageHandler:
    def get_all_with_status(self, proj_key: str) -> PackageListWithStatus:
        """
        Gibt alle Packages mit Status zurück.
        """
        proj = self.__get_project(proj_key)
        
        packages = []
        for pkg in proj.pkgs:
            packages.append(pkg.to_model_with_status())
        
        # Orphaned packages hinzufügen
        orphaned_keys = proj.get_orphaned_packages()
        for key in orphaned_keys:
            name, version = key.split("#", 1)
            packages.append(PackageWithStatus(
                id=key,
                name=name,
                version=version,
                display=None,
                status=PackageStatus.ORPHANED
            ))
        
        available = sum(1 for p in packages if p.status == PackageStatus.AVAILABLE)
        missing = sum(1 for p in packages if p.status == PackageStatus.MISSING)
        orphaned = len(orphaned_keys)
        
        return PackageListWithStatus(
            packages=packages,
            total=len(packages),
            available=available,
            missing=missing,
            orphaned=orphaned
        )
    
    def add_to_config(self, proj_key: str, name: str, version: str, 
                      display: str = None) -> PackageWithStatus:
        """
        Fügt ein Package zur Config hinzu (ohne Download).
        """
        proj = self.__get_project(proj_key)
        
        # Prüfen ob bereits vorhanden
        key = f"{name}#{version}"
        if any(f"{p.name}#{p.version}" == key for p in proj.config.packages):
            raise PackageAlreadyExists()
        
        pkg_config = PackageConfig(name=name, version=version, display=display)
        proj.config.packages.append(pkg_config)
        proj.config.write()
        
        # Status ermitteln
        pkg_dir = proj.data_dir / key
        status = PackageStatus.AVAILABLE if pkg_dir.exists() else PackageStatus.MISSING
        
        return PackageWithStatus(
            id=key,
            name=name,
            version=version,
            display=display,
            status=status
        )
    
    def remove_from_config(self, proj_key: str, package_id: str) -> bool:
        """
        Entfernt Package aus Config (Dateien bleiben).
        """
        proj = self.__get_project(proj_key)
        
        name, version = package_id.split("#", 1)
        proj.config.packages = [
            p for p in proj.config.packages 
            if not (p.name == name and p.version == version)
        ]
        proj.config.write()
        
        # Package aus pkgs-Liste entfernen
        proj.pkgs = [p for p in proj.pkgs if p.key != package_id]
        
        return True
    
    def delete_files(self, proj_key: str, package_id: str) -> bool:
        """
        Löscht Package-Dateien aus data-Ordner.
        """
        proj = self.__get_project(proj_key)
        pkg_dir = proj.data_dir / package_id
        
        if pkg_dir.exists():
            shutil.rmtree(pkg_dir)
            return True
        return False
```

---

## 6. Frontend-Änderungen

### 6.1 PackageService Erweiterung

**Datei**: `src/app/package.service.ts`

```typescript
@Injectable({
  providedIn: 'root'
})
export class PackageService {
  
  // NEU: Package zur Config hinzufügen
  addPackageToConfig(projectKey: string, packageData: {
    name: string;
    version: string;
    display?: string;
  }): Observable<PackageWithStatus> {
    return this.http.post<PackageWithStatus>(
      `${this.baseUrl}/project/${projectKey}/package/add`,
      packageData
    );
  }
  
  // NEU: Package aus Config entfernen
  removePackageFromConfig(projectKey: string, packageId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/project/${projectKey}/package/${packageId}/config`
    );
  }
  
  // NEU: Package-Dateien löschen
  deletePackageFiles(projectKey: string, packageId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/project/${projectKey}/package/${packageId}/files`
    );
  }
  
  // NEU: Orphaned Packages aufräumen
  cleanupOrphanedPackages(projectKey: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/project/${projectKey}/package/cleanup-orphaned`,
      {}
    );
  }
  
  // NEU: Orphaned Packages übernehmen
  adoptOrphanedPackages(projectKey: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/project/${projectKey}/package/adopt-orphaned`,
      {}
    );
  }
}
```

### 6.2 PackageListComponent Erweiterung

**Änderungen**:
- Status-Badges für `available`, `missing`, `orphaned`
- Download-Button für `missing` Packages
- Aktions-Menü mit:
  - "Aus Config entfernen" (available/missing → orphaned)
  - "Dateien löschen" (orphaned → entfernt)
  - "In Config übernehmen" (orphaned → available)

### 6.3 UI-Mockup

```
┌──────────────────────────────────────────────────────────────────┐
│ List of Packages                                            [+]  │
├──────────────────────────────────────────────────────────────────┤
│ Summary: 5 total | 3 available | 1 missing | 1 orphaned          │
├──────────────────────────────────────────────────────────────────┤
│ 🟢 kbv.ita.erp#1.3.2 (KBV eRezept)              [✏️] [🗑️]        │
│ 🟢 de.gematik.epa.medication#1.0.6-2            [✏️] [🗑️]        │
│ 🟢 kbv.ita.for#1.2.0                            [✏️] [🗑️]        │
│ 🟡 kbv.basis#1.7.0  [⬇️ Download]               [✏️] [🗑️]        │
│ ⚪ old.package#1.0.0 (orphaned)        [📥 Adopt] [🗑️ Delete]    │
└──────────────────────────────────────────────────────────────────┘
│                          [🧹 Cleanup All Orphaned]               │
└──────────────────────────────────────────────────────────────────┘

Legende:
🟢 = available (in Config + heruntergeladen)
🟡 = missing (in Config, nicht heruntergeladen)
⚪ = orphaned (heruntergeladen, nicht in Config)
```

---

## 7. Git-Konfiguration

### 7.1 .gitignore Anpassung

Da die Package-Daten nun als Cache behandelt werden und die Config die "Single Source of Truth" ist, sollten die `data`-Ordner **nicht** mehr mit Git versioniert werden.

**Änderung in `.gitignore`** (im `structure-comparer-projects` Ordner oder Root):

```gitignore
# Package data folders - these are downloaded caches, not source files
# The config.json contains the definitive package list
**/data/
```

**Begründung**:
- Package-Daten können jederzeit aus FHIR-Registries neu heruntergeladen werden
- Reduziert Repository-Größe erheblich (Packages sind oft mehrere MB groß)
- Vermeidet Merge-Konflikte bei binären/großen JSON-Dateien
- Config.json bleibt versioniert und enthält alle notwendigen Informationen

---

## 8. Migration

### 8.1 Migrationsstrategie

Bei bestehendem Projekt mit Packages im `data`-Ordner ohne entsprechende Config-Einträge:

1. **Automatische Migration beim ersten Start**: 
   - Scanne `data`-Ordner
   - Füge fehlende Packages automatisch zur Config hinzu
   - Zeige Benutzer Meldung über migrierte Packages

2. **Migration-Endpoint** (optional):
   ```
   POST /project/{project_key}/migrate-packages
   ```
   Response:
   ```json
   {
     "migrated": ["pkg1#1.0", "pkg2#2.0"],
     "count": 2
   }
   ```

### 8.2 Rückwärtskompatibilität

- **Phase 1 (Übergang)**: Auto-Discovery bleibt aktiv, aber mit Warnung
- **Phase 2 (Stabil)**: Auto-Discovery nur für Migration, nicht im Normalbetrieb
- **Phase 3 (Final)**: Auto-Discovery komplett entfernt

---

## 9. Config-Beispiel

### 9.1 Vollständige config.json nach Migration

```json
{
    "name": "dgMP Mapping_2025-10",
    "version": "1.13",
    "status": "active",
    "packages": [
        {
            "name": "kbv.ita.erp",
            "version": "1.3.2",
            "display": "KBV E-Rezept Profile"
        },
        {
            "name": "de.gematik.epa.medication",
            "version": "1.0.6-2",
            "display": "EPA Medication Profile"
        },
        {
            "name": "kbv.ita.for",
            "version": "1.2.0",
            "display": "KBV FOR Profile"
        },
        {
            "name": "de.gematik.fhir.directory",
            "version": "0.11.25",
            "display": "Gematik Directory"
        },
        {
            "name": "de.gematik.erezept-workflow.r4",
            "version": "1.5.2",
            "display": "E-Rezept Workflow"
        },
        {
            "name": "kbv.basis",
            "version": "1.7.0",
            "display": "KBV Basis Profile"
        }
    ],
    "comparisons": [],
    "transformations": [...],
    "target_creations": [...],
    "mappings": [...]
}
```

---

## 10. Implementierungsplan

### Phase 1: Backend (Priorität: Hoch)

| Schritt | Aufgabe                                              | Aufwand  |
|---------|------------------------------------------------------|----------|
| 1.1     | `PackageStatus` Enum und Models erweitern            | 1h       |
| 1.2     | `Project.__load_packages()` umschreiben              | 2h       |
| 1.3     | `Project.get_orphaned_packages()` implementieren     | 1h       |
| 1.4     | `PackageHandler` erweitern (neue Methoden)           | 3h       |
| 1.5     | Neue API-Endpoints in `serve.py`                     | 2h       |
| 1.6     | Migrationscode implementieren                        | 2h       |
| 1.7     | Unit Tests                                           | 3h       |

### Phase 2: Frontend (Priorität: Mittel)

| Schritt | Aufgabe                                              | Aufwand  |
|---------|------------------------------------------------------|----------|
| 2.1     | Models aktualisieren                                 | 0.5h     |
| 2.2     | `PackageService` erweitern                           | 1h       |
| 2.3     | `PackageListComponent` UI-Änderungen                 | 3h       |
| 2.4     | Status-Badges und Aktionen                           | 2h       |
| 2.5     | Orphaned-Management UI                               | 2h       |
| 2.6     | Integration Tests                                    | 2h       |

### Phase 3: Finalisierung (Priorität: Niedrig)

| Schritt | Aufgabe                                              | Aufwand  |
|---------|------------------------------------------------------|----------|
| 3.1     | Dokumentation aktualisieren                          | 1h       |
| 3.2     | OpenAPI-Spec aktualisieren                           | 0.5h     |
| 3.3     | Release Notes                                        | 0.5h     |

**Gesamtaufwand**: ca. 26 Stunden

---

## 11. Risiken & Offene Fragen

### Risiken

1. **Datenverlust bei Migration**: Packages könnten beim Umstieg verloren gehen
   - **Mitigation**: Ausführliches Logging, Backup-Empfehlung vor Migration

2. **Breaking Change für bestehende Projekte**: Workflow ändert sich
   - **Mitigation**: Sanfte Migration mit Auto-Adopt

### Offene Fragen

1. Soll `orphaned`-Status in der UI prominent angezeigt werden oder versteckt?
2. Automatisches Löschen von `orphaned` Packages nach X Tagen?
3. Sollen Package-Abhängigkeiten auch in Config definiert werden oder weiterhin aus `package.json` gelesen?

---

## 12. Akzeptanzkriterien

- [ ] Packages werden nur aus Config geladen, nicht mehr aus Dateisystem gescannt
- [ ] Status (`available`/`missing`/`orphaned`) wird korrekt ermittelt
- [ ] Neue Packages können zur Config hinzugefügt werden ohne Download
- [ ] Download-Button funktioniert für `missing` Packages
- [ ] `orphaned` Packages können in Config übernommen oder gelöscht werden
- [ ] Bestehende Projekte werden automatisch migriert
- [ ] Config-Datei bleibt lesbar und manuell editierbar
- [ ] `.gitignore` enthält Ausschluss für `data`-Ordner

---

## 13. Implementierungsfortschritt

### Status-Legende
- ⬜ Nicht begonnen
- 🔄 In Bearbeitung
- ✅ Abgeschlossen
- ❌ Blockiert

### Phase 0: Vorbereitung
| Schritt | Status | Datum      | Notizen |
|---------|--------|------------|---------|
| .gitignore anpassen | ✅ | 2025-12-11 | `structure-comparer-projects/*/data/` hinzugefügt in `.gitignore` |

### Phase 1: Backend
| Schritt | Status | Datum      | Notizen |
|---------|--------|------------|---------|
| 1.1 PackageStatus Enum und Models | ✅ | 2025-12-11 | `PackageStatus`, `PackageWithStatus`, `PackageListWithStatus`, `PackageAddRequest`, `PackageAddResult`, `OrphanedCleanupResult`, `OrphanedAdoptResult` hinzugefügt |
| 1.2 Project.__load_packages() | ✅ | 2025-12-11 | Komplett neu geschrieben: lädt nur noch aus Config, setzt Status AVAILABLE/MISSING |
| 1.3 Project.get_orphaned_packages() | ✅ | 2025-12-11 | Findet Packages im data-Ordner die nicht in Config sind |
| 1.4 PackageHandler erweitern | ✅ | 2025-12-11 | `get_list_with_status`, `add_to_config`, `remove_from_config`, `delete_files`, `cleanup_orphaned`, `adopt_orphaned` implementiert |
| 1.5 Neue API-Endpoints | ✅ | 2025-12-11 | 6 neue Endpoints: `GET /with-status`, `POST /add`, `DELETE /{id}/config`, `DELETE /{id}/files`, `POST /cleanup-orphaned`, `POST /adopt-orphaned` |
| 1.6 Migrationscode | ✅ | 2025-12-11 | Auto-Migration beim Start implementiert, Config.write() angepasst um packages immer zu schreiben |
| 1.7 Unit Tests | ⬜ | - | - |

### Phase 2: Frontend
| Schritt | Status | Datum      | Notizen |
|---------|--------|------------|---------|
| 2.1 Models aktualisieren | ⬜ | - | - |
| 2.2 PackageService erweitern | ⬜ | - | - |
| 2.3 PackageListComponent UI | ⬜ | - | - |
| 2.4 Status-Badges und Aktionen | ⬜ | - | - |
| 2.5 Orphaned-Management UI | ⬜ | - | - |
| 2.6 Integration Tests | ⬜ | - | - |

### Phase 3: Finalisierung
| Schritt | Status | Datum      | Notizen |
|---------|--------|------------|---------|
| 3.1 Dokumentation | ⬜ | - | - |
| 3.2 OpenAPI-Spec | ⬜ | - | - |
| 3.3 Release Notes | ⬜ | - | - |
