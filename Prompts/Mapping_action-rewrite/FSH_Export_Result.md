# FSH Export Implementation - Result Documentation

## Overview

This document describes the implementation of FSH (FHIR Shorthand) export functionality for the structure-comparer application. The feature allows users to export mapping actions as FHIR StructureMap definitions in FSH format, which can be used in FHIR implementation guides.

## Implementation Date

November 19, 2025

## Components Implemented

### Backend Components

#### 1. `service/src/structure_comparer/mapping_fsh_export.py`

New module providing core FSH generation functionality:

**Main Function:**
- `build_structuremap_fsh(mapping, actions, *, source_alias, target_alias, ruleset_name)` → str
  - Generates a complete FSH RuleSet from mapping actions
  - Supports USE actions with MANUAL and SYSTEM_DEFAULT sources
  - Generates TODO comments for non-USE actions (NOT_USE, EXTENSION, FIXED, etc.)
  - Creates properly formatted FSH rules with source/target context and documentation

**Helper Functions:**
- `_build_copy_rule()` - Generates individual copy rules for USE actions
- `_extract_element_name()` - Extracts element names from field paths
- `_sanitize_rule_name()` - Sanitizes field names for FSH rule identifiers
- `_sanitize_group_name()` - Sanitizes mapping names for FSH group identifiers

**FSH Structure Generated:**
```fsh
RuleSet: {ruleset_name}
// Auto-generated from structure-comparer mapping "{mapping.name}"
* group[+]
  * name = "{mapping.name}"
  * typeMode = #none
  * documentation = "..."
  * insert sd_input({source_alias}, source)
  * insert sd_input({target_alias}, target)
  
  * rule[+]
    * name = "{rule_name}"
    * source.context = "{source_alias}"
    * source.element = "{element_name}"
    * insert targetCopyVariable({target_alias}, {element_name})
    * documentation = "..."
```

#### 2. `service/tests/test_mapping_fsh_export.py`

Comprehensive test suite with 8 test cases covering:
- Single field mapping
- Multiple fields
- Non-USE actions (TODO generation)
- Inherited actions (filtering)
- Nested field paths
- Special characters in names
- User remarks in documentation
- Empty mappings

All tests passing ✓

#### 3. `service/src/structure_comparer/serve.py`

New API endpoint added:

**Endpoint:** `GET /project/{project_key}/mapping/{mapping_id}/structuremap.fsh`

**Tags:** `["Mappings", "FSH Export"]`

**Functionality:**
- Retrieves mapping and action information
- Generates source/target aliases from profile names
- Calls `build_structuremap_fsh()` to generate FSH content
- Returns FSH file with proper Content-Disposition header for download
- Media type: `text/fsh`
- Filename format: `{mapping_id}_structuremap.fsh`

**Error Handling:**
- 404: Project or mapping not found
- 500: FSH export generation failed

### Frontend Components

#### 1. `structure-comparer-frontend/src/app/mappings.service.ts`

New service method added:

```typescript
downloadStructureMapFsh(projectKey: string, mappingId: string): Observable<Blob>
```

**Functionality:**
- Calls the backend FSH export endpoint
- Returns file as Blob for download
- Includes proper URL encoding for parameters
- Error handling through catchError pipe

#### 2. `structure-comparer-frontend/src/app/mapping-detail/mapping-detail.component.ts`

New component method added:

```typescript
downloadStructureMapFsh(): void
```

**Functionality:**
- Generates sanitized filename from mapping name
- Calls `MappingsService.downloadStructureMapFsh()`
- Handles errors with user-friendly snackbar messages
- Triggers file download using existing `saveFile()` helper
- Shows success confirmation to user

#### 3. `structure-comparer-frontend/src/app/mapping-detail/mapping-detail.component.html`

New button added to the mapping detail toolbar:

**Location:** Top-right toolbar, next to "Download mapping" button

**Features:**
- Material Design raised button with accent color
- Download icon (mat-icon: `file_download`)
- Tooltip: "Export als FHIR StructureMap in FSH-Format"
- Label: "StructureMap (FSH)"
- Proper spacing with flex gap

## Predefined RuleSets

The FSH export assumes the following RuleSets are available in the FSH project:

```fsh
RuleSet: sd_structure(url, mode, alias)
* structure[+]
  * url = "{url}"
  * mode = #{mode}
  * alias = "{alias}"

RuleSet: sd_input(name, mode)
* input[+]
  * name = "{name}"
  * type = "{name}"
  * mode = #{mode}

RuleSet: targetCopyVariable(context, to)
* target[+]
  * context = "{context}"
  * contextType = #variable
  * element = "{to}"
  * transform = #copy
```

## Current Scope and Limitations

### Implemented Features
✓ Export of USE actions (compatible field mappings)
✓ Source and target profile alias generation
✓ Rule documentation from user remarks and system remarks
✓ Nested field path handling
✓ Special character sanitization
✓ Download as .fsh file with proper headers
✓ Frontend UI integration
✓ Error handling and user feedback

### Future Enhancements (TODO)
- Support for FIXED actions (constant value mappings)
- Support for EXTENSION actions (extension mappings)
- Support for COPY_FROM/COPY_TO actions (cross-field mappings)
- Support for NOT_USE actions (explicit exclusions)
- Multiple source profile handling (currently uses first source)
- Configurable FSH template customization
- Batch export for multiple mappings

## Usage

### Via UI
1. Navigate to a mapping detail page
2. Click the "StructureMap (FSH)" button in the top-right toolbar
3. The FSH file will be downloaded automatically

### Via API
```bash
curl -X GET \
  "http://localhost:8000/project/{project_key}/mapping/{mapping_id}/structuremap.fsh" \
  -o mapping.fsh
```

## Testing

### Backend Tests
```bash
cd service
poetry run pytest tests/test_mapping_fsh_export.py -v
```

All 8 tests passing ✓

### Manual Testing
1. Start backend server: `poetry run python -m structure_comparer serve`
2. Start frontend: `npm start`
3. Navigate to a mapping detail page
4. Click "StructureMap (FSH)" button
5. Verify downloaded file contains valid FSH syntax

## Technical Notes

### FSH Format Compliance
- Generated FSH follows FHIR Shorthand syntax specification
- Uses RuleSet pattern for reusability
- Proper escaping of special characters in strings
- Valid FSH identifiers (sanitized from field names)

### Profile Alias Generation
- Source alias: First source profile name, sanitized (spaces and hyphens removed)
- Target alias: Target profile name, sanitized
- Falls back to "source" and "target" if profiles not available

### Field Path Processing
- Resource type prefix is stripped (e.g., "MedicationDispense.medication" → "medication")
- Nested paths are preserved (e.g., "medication.reference" → "medication.reference")
- Colon separators are handled (for slice notation)

## Files Modified/Created

### Created
- `service/src/structure_comparer/mapping_fsh_export.py`
- `service/tests/test_mapping_fsh_export.py`
- `structure-comparer-frontend/Prompts/Mapping_action-rewrite/FSH_Export_Result.md` (this file)

### Modified
- `service/src/structure_comparer/serve.py` (added endpoint)
- `structure-comparer-frontend/src/app/mappings.service.ts` (added service method)
- `structure-comparer-frontend/src/app/mapping-detail/mapping-detail.component.ts` (added download method)
- `structure-comparer-frontend/src/app/mapping-detail/mapping-detail.component.html` (added button)

## Integration Points

### Backend Integration
- Uses existing `MappingHandler` to retrieve mapping data
- Uses existing `compute_mapping_actions` to get action information
- Integrates with FastAPI response system for file downloads
- Follows existing error handling patterns

### Frontend Integration
- Follows existing download pattern (same as HTML export)
- Uses existing Material Design components
- Consistent with existing error handling (snackbar notifications)
- Maintains existing UI layout and styling patterns

## Conclusion

The FSH export feature has been successfully implemented with:
- ✓ Complete backend implementation with comprehensive tests
- ✓ RESTful API endpoint with proper error handling
- ✓ Frontend UI integration with user-friendly button and notifications
- ✓ Support for the most common mapping scenario (USE actions)
- ✓ Extensible architecture for future action type support
- ✓ Full documentation

The implementation follows the existing codebase patterns and provides a solid foundation for future enhancements.
