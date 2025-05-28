import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdatePackageNameDialogComponent } from './update-package-name-dialog.component';

describe('UpdatePackageNameDialogComponent', () => {
  let component: UpdatePackageNameDialogComponent;
  let fixture: ComponentFixture<UpdatePackageNameDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdatePackageNameDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdatePackageNameDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
