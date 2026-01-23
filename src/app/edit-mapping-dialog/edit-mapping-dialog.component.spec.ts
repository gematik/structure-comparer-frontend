import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EditMappingDialogComponent } from './edit-mapping-dialog.component';

describe('EditMappingDialogComponent', () => {
  let component: EditMappingDialogComponent;
  let fixture: ComponentFixture<EditMappingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditMappingDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { name: 'Test Mapping', status: 'active', version: '1.0' } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditMappingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
