import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddComparisonDialogComponent } from './add-comparison-dialog.component';

describe('AddComparisonDialogComponent', () => {
  let component: AddComparisonDialogComponent;
  let fixture: ComponentFixture<AddComparisonDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddComparisonDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddComparisonDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
