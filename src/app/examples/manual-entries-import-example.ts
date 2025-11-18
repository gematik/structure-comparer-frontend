/*
 * Example usage of the importManualEntries service method
 * This demonstrates how to use the ProjectService to import legacy manual_entries.yaml files
 */

import { Component } from '@angular/core';
import { ProjectService } from '../project.service';
import { ImportManualEntriesResponse } from '../models/manual-entries-import.model';

export class ExampleManualEntriesImportUsage {

  constructor(private projectService: ProjectService) {}

  /**
   * Example method showing how to import a manual entries file
   * @param projectKey The project to import to
   * @param file The legacy manual_entries.yaml file
   */
  onImportManualEntries(projectKey: string, file: File): void {
    this.projectService.importManualEntries(projectKey, file)
      .subscribe({
        next: (response: ImportManualEntriesResponse) => {
          if (this.projectService.isImportSuccessful(response)) {
            console.log('Import successful:', response.message);
            console.log(`Imported ${response.imported_entries} entries with ${response.imported_fields} fields`);

            // Check ID mapping results
            if (response.id_mapping) {
              console.log(`ID Mapping: ${response.id_mapping.mapped_entries} mapped, ${response.id_mapping.unmapped_entries} unmapped`);

              if (response.id_mapping.warnings_count > 0) {
                console.warn(`${response.id_mapping.warnings_count} warnings during ID mapping`);
              }

              // Log mapping details
              console.log('Legacy ID -> Current ID mappings:', response.id_mapping.mappings);
            }
          } else {
            console.error('Import failed:', response.message);
          }
        },
        error: (error) => {
          console.error('Import error:', error);
          // Handle error (show user notification, etc.)
        }
      });
  }

  /**
   * Example file input change handler
   * @param event The file input change event
   */
  onFileSelected(event: Event, projectKey: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!file.name.toLowerCase().endsWith('.yaml') && !file.name.toLowerCase().endsWith('.yml')) {
        console.error('Please select a YAML file');
        return;
      }

      this.onImportManualEntries(projectKey, file);
    }
  }
}
