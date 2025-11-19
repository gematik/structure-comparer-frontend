# Analyse-Prompt: Verhalten bei Mapping-Actions („not_use“) untersuchen

Du bist ein erfahrener Fullstack-Entwickler (Python/FastAPI + Angular) und kennst das bestehende Mapping-/Evaluationssystem.

Ziel dieses Schritts:  
**Nur Analyse, keine Code-Änderungen.**  
Untersuche, wie das System aktuell das Verhalten von Mapping-Actions verarbeitet – insbesondere für `not_use` – und dokumentiere das Ergebnis in einer separaten Markdown-Datei, damit es anschließend gemeinsam ausgewertet werden kann.

Bitte dokumentiere deine Ergebnisse in der Datei:

> `Prompts/Mapping_action-behavior/Result_Step_1_mapping_not_use_behavior_analysis.md`

---

## Fachlicher Kontext

Ausgangssituation im UI (Mapping-Detail-Ansicht):

Für das Feld `Practitioner.meta.tag` wird im UI die Mapping-Action **„not_use“** gesetzt.  
Dadurch entsteht in der Konfigurationsdatei `manual_entries.yaml` u. a. der Eintrag:

```yaml
entries:
  - fields:
      - action: not_use
        fixed: null
        name: Practitioner.meta.tag
        other: null
        remark: null
    id: e64f9b0a-2a2a-4f8f-9b86-7b6f8f4d2d31
```

Aktuelles Verhalten laut UI:

- `Practitioner.meta.tag`  
  - Status: **Gelöst**  
  - Mapping: **„Wird nicht verwendet“** (korrekt)

- `Practitioner.meta.tag:Origin`  
  - Status: **Gelöst**  
  - Mapping: **„Wird nicht befüllt“** (korrekt, da Knoten darüber ausgeschlossen ist)

- `Practitioner.meta.tag:profile:forProfile`  
  - Status: **Gelöst** (das ist fachlich OK)  
  - **Mapping-Text aktuell:** „Extension and value(s) will be retained“  
    - Erwartet wäre aber fachlich ebenfalls eine Begründung vom Typ **„Wird nicht befüllt“**, da das gesamte `meta.tag`-Konstrukt ausgeschlossen wird.

Verdacht:  
Die Ableitung der Mapping-Action / des Mapping-Texts für untergeordnete Felder (`profile:forProfile`) bei übergeordneten `not_use`-Aktionen ist inkonsistent oder basiert auf einer separaten Heuristik (z. B. „extension resolved“).

---

## Aufgabe: Schrittweise Analyse (ohne Änderungen)

Bitte führe die folgenden Schritte durch und dokumentiere das Ergebnis **nur** in `mapping_not_use_behavior_analysis.md`.

### 1. Relevante Stellen im Backend identifizieren

Untersuche im Backend (Python):

- **Konfiguration und Verarbeitung von `manual_entries.yaml`:**
  - Wo wird `manual_entries.yaml` eingelesen und geparst?
  - Wie werden Einträge wie `action: not_use` für `Practitioner.meta.tag` den internen Mapping-Strukturen zugeordnet?

- **Evaluation/Mapping-Engine:**
  - Wo werden Mapping-Actions („not_use“, „empty“, „extension“, „use“, etc.) interpretiert?
  - Wo wird entschieden, welche Aktion/Begründung für **untergeordnete Felder** gilt, wenn der übergeordnete Knoten `not_use` ist?
  - Wo entstehen die Texte wie „Extension and value(s) will be retained“?

- **Erzeugung der Daten für das Frontend:**
  - In welcher Funktion/Klasse werden die endgültigen Felddaten für den Endpoint
    `GET /project/{project_key}/mapping/{mapping_id}` aufgebaut?
  - Welche Felder/Strukturen liefern später die Informationen:
    - `action`
    - `classification`
    - `enhanced_classification` / `issues` / `recommendations`
    - eventuell interne Flags, die zu „Extension and value(s) will be retained“ führen.

Bitte liste in der Analyse-Datei alle relevanten Python-Dateien, Klassen und Funktionen auf, mit einer kurzen Beschreibung, **welche Rolle** sie im Kontext `not_use`/Vererbung/Extensions spielen.

### 2. Relevante Stellen im Frontend identifizieren

Betrachte im Angular-Frontend:

- Modelle und Helper:
  - `mapping.model.ts`, `mapping-evaluation.model.ts`
  - `MappingTextHelper` (oder die Funktion, die den Mapping-Text erzeugt)
  - ggf. `StatusHelper`, `EvaluationHelper`

- Komponente:
  - `mapping-detail.component.ts`
  - `mapping-detail.component.html`

Analysefragen:

- Welche Properties und Felder werden verwendet, um:
  - den Mapping-Status „Gelöst“ anzuzeigen?
  - den Text „Wird nicht verwendet“, „Wird nicht befüllt“ und „Extension and value(s) will be retained“ zu erzeugen?

- Wird für `profile:forProfile` ein anderer Pfad/Heuristik verwendet als für `Origin`?

### 3. Konkreter Ablauf für das Beispiel „Practitioner.meta.tag“

Rekonstruiere möglichst genau den Ablauf für dieses Beispiel:

1. Wie wird der Mapping-Eintrag aus `manual_entries.yaml` (`action: not_use` für `Practitioner.meta.tag`) vom Backend eingelesen und auf die internen Daten angewendet?
2. Wie berechnet die Evaluation/Engine den Status und die Action für:
   - `Practitioner.meta.tag`
   - `Practitioner.meta.tag:Origin`
   - `Practitioner.meta.tag:profile:forProfile`
3. Wie entsteht die Kombination:
   - `Status = Gelöst`
   - `Mapping-Text = "Extension and value(s) will be retained"` gerade für `profile:forProfile`?

Bitte halte diese Kette in der Analyse-Datei explizit fest (gern als nummerierte Liste oder Sequenzdiagramm in Textform).

### 4. Vermutete Ursache(n) dokumentieren

Am Ende der Datei `mapping_not_use_behavior_analysis.md`:

- Fasse zusammen, **warum** nach heutigem Stand:
  - `Origin` korrekt „Wird nicht befüllt“ erhält,
  - `profile:forProfile` jedoch „Extension and value(s) will be retained“ erhält.

- Formuliere 1–3 Hypothesen, woran die Abweichung liegen könnte, z. B.:
  - andere Heuristik für Extensions,
  - keine konsistente Vererbung von `not_use` auf alle Unterknoten,
  - Sonderfall-Behandlung für `profile:forProfile`.

WICHTIG:  
**In diesem Schritt keine Fixes oder Refactorings durchführen.**  
Es geht ausschließlich um eine präzise Analyse, die wir anschließend gemeinsam bewerten und daraus Ziel-Prompts für die eigentliche Korrektur ableiten.

---

## Ergebnis

Am Ende dieses Prompts soll im Projekt eine Datei vorliegen:

> `mapping_not_use_behavior_analysis.md`

mit folgendem Inhalt:

- Liste der relevanten Backend-Module/Funktionen und deren Rolle
- Liste der relevanten Frontend-Dateien/Funktionen und deren Rolle
- Rekonstruktion des Ablaufs für `Practitioner.meta.tag` und seine Kinder
- Hypothesen zur Ursache der inkonsistenten Behandlung von `profile:forProfile`

Bitte ändere dafür **keinen produktiven Code**, sondern nur diese Analyse-Datei anlegen/füllen.
