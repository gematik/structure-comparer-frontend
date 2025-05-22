import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PackageUploadDialogComponent } from './package-upload-dialog.component';

describe('PackageUploadDialogComponent', () => {
  let component: PackageUploadDialogComponent;
  let fixture: ComponentFixture<PackageUploadDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PackageUploadDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PackageUploadDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
