import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileComparisonComponent } from './profile-comparison.component';

describe('ProfileComparisonComponent', () => {
  let component: ProfileComparisonComponent;
  let fixture: ComponentFixture<ProfileComparisonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComparisonComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProfileComparisonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
