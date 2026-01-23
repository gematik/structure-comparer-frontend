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

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectService } from './project.service';
import { ImportManualEntriesResponse } from './models/manual-entries-import.model';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://127.0.0.1:8000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectService]
    });
    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setProjectData and getProjectData', () => {
    it('should store and retrieve project data', () => {
      const testData = { name: 'Test Project', key: 'test-key' };

      service.setProjectData(testData);
      const retrieved = service.getProjectData();

      expect(retrieved).toEqual(testData);
    });

    it('should return null initially', () => {
      const data = service.getProjectData();
      expect(data).toBeNull();
    });
  });

  describe('clearProjectData', () => {
    it('should clear stored project data', () => {
      const testData = { name: 'Test Project' };

      service.setProjectData(testData);
      service.clearProjectData();

      expect(service.getProjectData()).toBeNull();
    });
  });

  describe('importManualEntries', () => {
    it('should send POST request with FormData', () => {
      const projectKey = 'test-project';
      const testFile = new File(['test content'], 'test.yaml', { type: 'application/x-yaml' });
      const mockResponse: ImportManualEntriesResponse = {
        status: 'ok',
        message: 'Import successful',
        project_key: projectKey,
        imported_entries: 1,
        imported_fields: 5,
        filename: 'test.yaml',
        id_mapping: {
          mapped_entries: 1,
          unmapped_entries: 0,
          warnings_count: 0,
          mappings: { 'legacy-id': 'new-id' }
        }
      };

      service.importManualEntries(projectKey, testFile).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/project/test-project/manual-entries/import`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeInstanceOf(FormData);

      // Check that FormData contains the file
      const formData = req.request.body as FormData;
      expect(formData.get('file')).toBe(testFile);

      req.flush(mockResponse);
    });

    it('should handle special characters in project key', () => {
      const projectKey = 'test project/with#special chars';
      const testFile = new File(['content'], 'test.yaml');
      const expectedEncodedKey = encodeURIComponent(projectKey);

      service.importManualEntries(projectKey, testFile).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/project/${expectedEncodedKey}/manual-entries/import`);
      expect(req.request.method).toBe('POST');
      req.flush({ status: 'ok' });
    });

    it('should handle HTTP errors', () => {
      const projectKey = 'test-project';
      const testFile = new File(['content'], 'test.yaml');

      service.importManualEntries(projectKey, testFile).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/project/test-project/manual-entries/import`);
      req.flush(
        { error: 'Import failed' },
        { status: 500, statusText: 'Internal Server Error' }
      );
    });
  });

  describe('isImportSuccessful', () => {
    it('should return true for successful import', () => {
      const successResponse: ImportManualEntriesResponse = {
        status: 'ok',
        message: 'Success',
        project_key: 'test-project',
        imported_entries: 1,
        imported_fields: 3,
        filename: 'test.yaml'
      };

      expect(service.isImportSuccessful(successResponse)).toBe(true);
    });

    it('should return false for failed import', () => {
      const failResponse: ImportManualEntriesResponse = {
        status: 'error',
        message: 'Failed',
        project_key: 'test-project',
        imported_entries: 0,
        imported_fields: 0,
        filename: 'test.yaml'
      };

      expect(service.isImportSuccessful(failResponse)).toBe(false);
    });
  });

  describe('getProjectProfiles', () => {
    it('should send GET request to correct URL', () => {
      const projectKey = 'test-project';
      const mockProfiles = [{ id: '1', name: 'Profile 1' }];

      service.getProjectProfiles(projectKey).subscribe(profiles => {
        expect(profiles).toEqual(mockProfiles);
      });

      const req = httpMock.expectOne(`${baseUrl}/project/test-project/profile`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProfiles);
    });
  });

  describe('reloadProjectData', () => {
    it('should send GET request to reload project data', () => {
      const projectKey = 'test-project';
      const mockProject = { key: projectKey, name: 'Test Project' };

      service.reloadProjectData(projectKey).subscribe(project => {
        expect(project).toEqual(mockProject);
      });

      const req = httpMock.expectOne(`${baseUrl}/project/test-project`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProject);
    });
  });
});
