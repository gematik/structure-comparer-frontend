import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMappingDialogComponent } from './add-mapping-dialog.component';

describe('AddMappingDialogComponent', () => {
  let component: AddMappingDialogComponent;
  let fixture: ComponentFixture<AddMappingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMappingDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddMappingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
