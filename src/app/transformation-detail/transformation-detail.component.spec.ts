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
 */
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { TransformationDetailComponent, ValueMappingRow } from './transformation-detail.component';
import { TransformationService } from '../transformation.service';
import { ProjectService } from '../project.service';

describe('TransformationDetailComponent', () => {
  let component: TransformationDetailComponent;
  let fixture: ComponentFixture<TransformationDetailComponent>;
  let transformationServiceSpy: jasmine.SpyObj<TransformationService>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => {
          if (key === 'projectKey') return 'test-project';
          if (key === 'transformationId') return 'test-transformation';
          return null;
        }
      }
    }
  };

  beforeEach(async () => {
    transformationServiceSpy = jasmine.createSpyObj('TransformationService', [
      'getTransformation',
      'getTransformationFields',
      'updateTransformationField',
      'linkMapping',
      'unlinkMapping'
    ]);
    projectServiceSpy = jasmine.createSpyObj('ProjectService', [
      'getProjectProfiles',
      'getResolvedProfileFields'
    ]);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Setup default mock responses
    transformationServiceSpy.getTransformation.and.returnValue(of({
      id: 'test-transformation',
      name: 'Test Transformation',
      url: 'http://example.com',
      version: '1.0.0',
      last_updated: '2025-01-01',
      status: 'active',
      sources: [{ url: 'http://source.com', name: 'Source', version: '1.0' }],
      target: { url: 'http://target.com', name: 'Target', version: '1.0' },
      linked_mappings: []
    }));
    transformationServiceSpy.getTransformationFields.and.returnValue(of([]));
    projectServiceSpy.getProjectProfiles.and.returnValue(of([]));
    projectServiceSpy.getResolvedProfileFields.and.returnValue(of({
      resource_fields: [],
      value_fields: [],
      unresolved_references: []
    }));

    await TestBed.configureTestingModule({
      imports: [TransformationDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: routerSpy },
        { provide: TransformationService, useValue: transformationServiceSpy },
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransformationDetailComponent);
    component = fixture.componentInstance;
  });

  describe('saveValueChanges', () => {
    const createValueMappingRow = (overrides: Partial<ValueMappingRow> = {}): ValueMappingRow => ({
      targetField: 'TestField',
      targetName: 'Test Field',
      targetPath: 'Test.Field',
      action: null,
      copyFromSource: null,
      originalAction: null,
      originalCopyFromSource: null,
      hasChildren: false,
      depth: 0,
      isValueXField: false,
      cardinalityMin: 0,
      cardinalityMax: '1',
      ...overrides
    });

    it('should show snackbar when no changes exist', () => {
      component.valueMappings = [
        createValueMappingRow({ action: 'copy_value_from', originalAction: 'copy_value_from' })
      ];

      component.saveValueChanges();

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Keine Änderungen zum Speichern',
        'OK',
        { duration: 2000 }
      );
      expect(transformationServiceSpy.updateTransformationField).not.toHaveBeenCalled();
    });

    it('should reject copy_value_from action without source field', () => {
      component.valueMappings = [
        createValueMappingRow({
          targetField: 'Parameters.parameter:rxPrescription.part:authoredOn.value[x]',
          action: 'copy_value_from',
          copyFromSource: null,  // No source selected!
          originalAction: null,
          originalCopyFromSource: null
        })
      ];

      component.saveValueChanges();

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringContaining('copy_value_from'),
        'OK',
        { duration: 5000 }
      );
      expect(transformationServiceSpy.updateTransformationField).not.toHaveBeenCalled();
    });

    it('should reject copy_value_to action without target field', () => {
      component.valueMappings = [
        createValueMappingRow({
          targetField: 'TestField',
          action: 'copy_value_to',
          copyFromSource: null,  // No target selected!
          originalAction: null
        })
      ];

      component.saveValueChanges();

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringContaining('copy_value_from'),
        'OK',
        { duration: 5000 }
      );
      expect(transformationServiceSpy.updateTransformationField).not.toHaveBeenCalled();
    });

    it('should send null action when action is cleared', fakeAsync(() => {
      component.projectKey = 'test-project';
      component.transformationId = 'test-transformation';
      component.valueMappings = [
        createValueMappingRow({
          targetField: 'TestField',
          action: null,  // User cleared the action
          copyFromSource: null,
          originalAction: 'copy_value_from',  // Was copy_value_from before
          originalCopyFromSource: 'SourceField'
        })
      ];

      transformationServiceSpy.updateTransformationField.and.returnValue(of({
        name: 'TestField',
        path: 'Test.Field',
        action: null,
        actions_allowed: [],
        recommendations: []
      }));

      component.saveValueChanges();
      tick();

      expect(transformationServiceSpy.updateTransformationField).toHaveBeenCalledWith(
        'test-project',
        'test-transformation',
        'TestField',
        jasmine.objectContaining({
          action: null,
          other: undefined
        })
      );
    }));

    it('should send copy_value_from with valid source field', fakeAsync(() => {
      component.projectKey = 'test-project';
      component.transformationId = 'test-transformation';
      component.valueMappings = [
        createValueMappingRow({
          targetField: 'Parameters.parameter:rxPrescription.part:authoredOn.value[x]',
          action: 'copy_value_from',
          copyFromSource: 'MedicationRequest.authoredOn',
          originalAction: null,
          originalCopyFromSource: null
        })
      ];

      transformationServiceSpy.updateTransformationField.and.returnValue(of({
        name: 'Parameters.parameter:rxPrescription.part:authoredOn.value[x]',
        path: 'Parameters.parameter:rxPrescription.part:authoredOn.value[x]',
        action: 'copy_value_from',
        other: 'MedicationRequest.authoredOn',
        actions_allowed: [],
        recommendations: []
      }));

      component.saveValueChanges();
      tick();

      expect(transformationServiceSpy.updateTransformationField).toHaveBeenCalledWith(
        'test-project',
        'test-transformation',
        'Parameters.parameter:rxPrescription.part:authoredOn.value[x]',
        {
          action: 'copy_value_from',
          other: 'MedicationRequest.authoredOn'
        }
      );
    }));

    it('should handle server 400 error gracefully', fakeAsync(() => {
      component.projectKey = 'test-project';
      component.transformationId = 'test-transformation';
      component.valueMappings = [
        createValueMappingRow({
          targetField: 'TestField',
          action: 'use',
          originalAction: null
        })
      ];

      transformationServiceSpy.updateTransformationField.and.returnValue(
        throwError(() => new Error('Server returned code 400: Bad Request'))
      );

      component.saveValueChanges();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringContaining('Fehler'),
        'OK',
        jasmine.any(Object)
      );
    }));

    it('should allow use action without other field', fakeAsync(() => {
      component.projectKey = 'test-project';
      component.transformationId = 'test-transformation';
      component.valueMappings = [
        createValueMappingRow({
          targetField: 'TestField',
          action: 'use',
          copyFromSource: null,
          originalAction: null
        })
      ];

      transformationServiceSpy.updateTransformationField.and.returnValue(of({
        name: 'TestField',
        path: 'Test.Field',
        action: 'use',
        actions_allowed: [],
        recommendations: []
      }));

      component.saveValueChanges();
      tick();

      // Should proceed without validation error
      expect(transformationServiceSpy.updateTransformationField).toHaveBeenCalledWith(
        'test-project',
        'test-transformation',
        'TestField',
        {
          action: 'use',
          other: undefined
        }
      );
    }));

    it('should allow not_use action without other field', fakeAsync(() => {
      component.projectKey = 'test-project';
      component.transformationId = 'test-transformation';
      component.valueMappings = [
        createValueMappingRow({
          targetField: 'TestField',
          action: 'not_use',
          copyFromSource: null,
          originalAction: null
        })
      ];

      transformationServiceSpy.updateTransformationField.and.returnValue(of({
        name: 'TestField',
        path: 'Test.Field',
        action: 'not_use',
        actions_allowed: [],
        recommendations: []
      }));

      component.saveValueChanges();
      tick();

      expect(transformationServiceSpy.updateTransformationField).toHaveBeenCalledWith(
        'test-project',
        'test-transformation',
        'TestField',
        {
          action: 'not_use',
          other: undefined
        }
      );
    }));
  });
});
