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
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { EditProjectComponent } from './edit-project.component';
import { ProjectService } from '../project.service';
import { MappingsService } from '../mappings.service';
import { ComparisonService } from '../comparison.service';
import { PackageService } from '../package.service';
import { ImportManualEntriesResponse } from '../models/manual-entries-import.model';

describe('EditProjectComponent', () => {
  let component: EditProjectComponent;
  let fixture: ComponentFixture<EditProjectComponent>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let mappingsService: jasmine.SpyObj<MappingsService>;
  let comparisonService: jasmine.SpyObj<ComparisonService>;
  let packageService: jasmine.SpyObj<PackageService>;

  beforeEach(async () => {
    const projectServiceSpy = jasmine.createSpyObj('ProjectService', [
      'importManualEntries',
      'isImportSuccessful',
      'getProjectData',
      'reloadProjectData'
    ]);
    const mappingsServiceSpy = jasmine.createSpyObj('MappingsService', ['getMappings']);
    const comparisonServiceSpy = jasmine.createSpyObj('ComparisonService', ['getComparisons']);
    const packageServiceSpy = jasmine.createSpyObj('PackageService', ['getPackages']);

    await TestBed.configureTestingModule({
      imports: [
        EditProjectComponent,
        RouterTestingModule,
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: MappingsService, useValue: mappingsServiceSpy },
        { provide: ComparisonService, useValue: comparisonServiceSpy },
        { provide: PackageService, useValue: packageServiceSpy }
      ]
    })
    .compileComponents();

    projectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
    mappingsService = TestBed.inject(MappingsService) as jasmine.SpyObj<MappingsService>;
    comparisonService = TestBed.inject(ComparisonService) as jasmine.SpyObj<ComparisonService>;
    packageService = TestBed.inject(PackageService) as jasmine.SpyObj<PackageService>;

    fixture = TestBed.createComponent(EditProjectComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Manual Entries Import', () => {
    beforeEach(() => {
      // Set up component with minimal required data
      component.projectKey = 'test-project';
      component.projectName = 'Test Project';
    });

    it('should handle file selection', () => {
      const file = new File(['test content'], 'manual_entries.yaml', { type: 'application/x-yaml' });
      const event = {
        target: {
          files: [file]
        }
      };

      component.onManualEntriesFileSelected(event);

      expect(component.selectedImportFile).toBe(file);
      expect(component.importError).toBeNull();
      expect(component.importResult).toBeNull();
    });

    it('should reject non-YAML files', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const event = {
        target: {
          files: [file]
        }
      };

      component.onManualEntriesFileSelected(event);

      expect(component.selectedImportFile).toBeNull();
      expect(component.importError).toContain('YAML');
    });

    it('should handle successful import', () => {
      const file = new File(['test content'], 'manual_entries.yaml', { type: 'application/x-yaml' });
      const mockResponse: ImportManualEntriesResponse = {
        status: 'ok',
        message: 'Import successful',
        project_key: 'test-project',
        imported_entries: 5,
        imported_fields: 15,
        filename: 'manual_entries.yaml',
        id_mapping: {
          mapped_entries: 4,
          unmapped_entries: 1,
          warnings_count: 0,
          mappings: {
            'legacy-1': 'current-1',
            'legacy-2': 'current-2'
          }
        }
      };

      component.selectedImportFile = file;
      projectService.importManualEntries.and.returnValue(of(mockResponse));
      projectService.isImportSuccessful.and.returnValue(true);

      component.onImportManualEntries();

      expect(projectService.importManualEntries).toHaveBeenCalledWith('test-project', file);
      expect(component.isImportingManualEntries).toBe(false);
      expect(component.importResult).toBe(mockResponse);
      expect(component.importError).toBeNull();
    });

    it('should handle import error', () => {
      const file = new File(['invalid content'], 'manual_entries.yaml', { type: 'application/x-yaml' });
      const errorResponse = {
        status: 422,
        error: {
          error: 'Invalid YAML format'
        }
      };

      component.selectedImportFile = file;
      projectService.importManualEntries.and.returnValue(throwError(errorResponse));

      component.onImportManualEntries();

      expect(component.isImportingManualEntries).toBe(false);
      expect(component.importError).toBe('Invalid YAML format');
      expect(component.importResult).toBeNull();
    });

    it('should not import when no file is selected', () => {
      component.selectedImportFile = null;

      component.onImportManualEntries();

      expect(projectService.importManualEntries).not.toHaveBeenCalled();
      expect(component.importError).toBe('Bitte wählen Sie zuerst eine YAML-Datei aus.');
    });

    it('should show loading state during import', () => {
      const file = new File(['test content'], 'manual_entries.yaml', { type: 'application/x-yaml' });
      component.selectedImportFile = file;

      // Create a subject to control when the observable emits
      const subject = new (require('rxjs').Subject)();
      projectService.importManualEntries.and.returnValue(subject.asObservable());

      component.onImportManualEntries();

      // Should be in loading state
      expect(component.isImportingManualEntries).toBe(true);
      expect(component.importError).toBeNull();
      expect(component.importResult).toBeNull();

      // Complete the observable
      const mockResponse: ImportManualEntriesResponse = {
        status: 'ok',
        message: 'Success',
        project_key: 'test-project',
        imported_entries: 1,
        imported_fields: 3,
        filename: 'test.yaml'
      };
      subject.next(mockResponse);
      subject.complete();

      // Should no longer be loading
      expect(component.isImportingManualEntries).toBe(false);
    });

    it('should check if import is successful', () => {
      const successResponse: ImportManualEntriesResponse = {
        status: 'ok',
        message: 'Success',
        project_key: 'test',
        imported_entries: 1,
        imported_fields: 3,
        filename: 'test.yaml'
      };

      projectService.isImportSuccessful.and.returnValue(true);
      expect(component.isImportSuccessful(successResponse)).toBe(true);
      expect(projectService.isImportSuccessful).toHaveBeenCalledWith(successResponse);
    });

    it('should extract error messages correctly', () => {
      // Test with error.error.error format
      let error = { error: { error: 'Specific error message' } };
      let result = component['extractImportErrorMessage'](error);
      expect(result).toBe('Specific error message');

      // Test with error.message format
      error = { message: 'General error message' };
      result = component['extractImportErrorMessage'](error);
      expect(result).toBe('General error message');

      // Test with unknown error format
      error = { unknown: 'format' };
      result = component['extractImportErrorMessage'](error);
      expect(result).toBe('Beim Import ist ein unbekannter Fehler aufgetreten.');
    });
  });
});
