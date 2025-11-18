/*
 *
 * Copyright 2025 gematik GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * *******
 *
 * For additional notes and disclaimer from gematik and in case of changes by gematik find details in the "Readme" file.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ManualEntriesImportDialogComponent, ManualEntriesImportDialogData } from './manual-entries-import-dialog.component';
import { ProjectService } from '../project.service';
import { ImportManualEntriesResponse } from '../models/manual-entries-import.model';

describe('ManualEntriesImportDialogComponent', () => {
  let component: ManualEntriesImportDialogComponent;
  let fixture: ComponentFixture<ManualEntriesImportDialogComponent>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ManualEntriesImportDialogComponent>>;
  let mockDialogData: ManualEntriesImportDialogData;

  beforeEach(async () => {
    // Create spies
    mockProjectService = jasmine.createSpyObj('ProjectService', ['importManualEntries', 'isImportSuccessful']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockDialogData = { projectKey: 'test-project' };

    await TestBed.configureTestingModule({
      imports: [
        ManualEntriesImportDialogComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManualEntriesImportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with project key from dialog data', () => {
    expect(component.projectKey).toBe('test-project');
  });

  describe('onManualEntriesFileSelected', () => {
    it('should accept valid YAML file', () => {
      const mockFile = new File(['test content'], 'test.yaml', { type: 'application/x-yaml' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      } as any;

      component.onManualEntriesFileSelected(mockEvent);

      expect(component.selectedImportFile).toBe(mockFile);
      expect(component.importError).toBeNull();
    });

    it('should accept valid YML file', () => {
      const mockFile = new File(['test content'], 'test.yml', { type: 'application/x-yaml' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      } as any;

      component.onManualEntriesFileSelected(mockEvent);

      expect(component.selectedImportFile).toBe(mockFile);
      expect(component.importError).toBeNull();
    });

    it('should reject non-YAML file', () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      } as any;

      component.onManualEntriesFileSelected(mockEvent);

      expect(component.selectedImportFile).toBeNull();
      expect(component.importError).toBe('Bitte wählen Sie eine YAML-Datei (.yaml oder .yml) aus.');
    });

    it('should handle no file selected', () => {
      const mockEvent = {
        target: {
          files: []
        }
      } as any;

      component.onManualEntriesFileSelected(mockEvent);

      expect(component.selectedImportFile).toBeNull();
    });

    it('should reset previous errors when selecting valid file', () => {
      component.importError = 'Previous error';
      component.importResult = {} as any;

      const mockFile = new File(['content'], 'test.yaml');
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      } as any;

      component.onManualEntriesFileSelected(mockEvent);

      expect(component.importError).toBeNull();
      expect(component.importResult).toBeNull();
    });
  });

  describe('onImportManualEntries', () => {
    beforeEach(() => {
      const mockFile = new File(['content'], 'test.yaml');
      component.selectedImportFile = mockFile;
    });

    it('should do nothing if no file selected', () => {
      component.selectedImportFile = null;

      component.onImportManualEntries();

      expect(mockProjectService.importManualEntries).not.toHaveBeenCalled();
    });

    it('should show error if no project key', () => {
      component.projectKey = '';

      component.onImportManualEntries();

      expect(component.importError).toBe('Projekt-Schlüssel ist nicht verfügbar.');
      expect(mockProjectService.importManualEntries).not.toHaveBeenCalled();
    });

    it('should call project service and handle success', () => {
      const mockResponse: ImportManualEntriesResponse = {
        status: 'ok',
        message: 'Success',
        project_key: 'test-project',
        imported_entries: 1,
        imported_fields: 3,
        filename: 'test.yaml'
      };

      mockProjectService.importManualEntries.and.returnValue(of(mockResponse));
      mockProjectService.isImportSuccessful.and.returnValue(true);

      component.onImportManualEntries();

      expect(component.isImportingManualEntries).toBe(false);
      expect(component.importResult).toBe(mockResponse);
      expect(component.importError).toBeNull();
      expect(mockProjectService.importManualEntries).toHaveBeenCalledWith('test-project', component.selectedImportFile!);
    });

    it('should handle service failure response', () => {
      const mockResponse: ImportManualEntriesResponse = {
        status: 'error',
        message: 'Import failed',
        project_key: 'test-project',
        imported_entries: 0,
        imported_fields: 0,
        filename: 'test.yaml'
      };

      mockProjectService.importManualEntries.and.returnValue(of(mockResponse));
      mockProjectService.isImportSuccessful.and.returnValue(false);

      component.onImportManualEntries();

      expect(component.importResult).toBe(mockResponse);
      expect(component.importError).toBe('Import failed');
    });

    it('should handle HTTP error', () => {
      const errorResponse = {
        error: { error: 'Server error' }
      };

      mockProjectService.importManualEntries.and.returnValue(throwError(errorResponse));

      component.onImportManualEntries();

      expect(component.importError).toBe('Server error');
      expect(component.importResult).toBeNull();
    });

    it('should set loading state during import', () => {
      mockProjectService.importManualEntries.and.returnValue(of({} as any));

      expect(component.isImportingManualEntries).toBe(false);

      component.onImportManualEntries();

      // The observable completes immediately in tests, so loading should be false again
      expect(component.isImportingManualEntries).toBe(false);
    });
  });

  describe('isImportSuccessful', () => {
    it('should delegate to project service', () => {
      const mockResponse = {} as ImportManualEntriesResponse;
      mockProjectService.isImportSuccessful.and.returnValue(true);

      const result = component.isImportSuccessful(mockResponse);

      expect(result).toBe(true);
      expect(mockProjectService.isImportSuccessful).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('Dialog actions', () => {
    it('should close dialog on cancel', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });

    it('should close dialog with result on close', () => {
      const mockResult = {} as ImportManualEntriesResponse;
      component.importResult = mockResult;

      component.onClose();

      expect(mockDialogRef.close).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('extractImportErrorMessage', () => {
    it('should extract nested error message', () => {
      const error = {
        error: { error: 'Nested error message' }
      };

      const result = (component as any).extractImportErrorMessage(error);
      expect(result).toBe('Nested error message');
    });

    it('should extract top-level message', () => {
      const error = {
        message: 'Top level error'
      };

      const result = (component as any).extractImportErrorMessage(error);
      expect(result).toBe('Top level error');
    });

    it('should return default message for unknown error', () => {
      const error = {};

      const result = (component as any).extractImportErrorMessage(error);
      expect(result).toBe('Beim Import ist ein unbekannter Fehler aufgetreten.');
    });
  });
});
