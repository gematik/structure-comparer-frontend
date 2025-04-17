import { TestBed } from '@angular/core/testing';

import { MappingsService } from './mappings.service';

describe('MappingsService', () => {
  let service: MappingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MappingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
