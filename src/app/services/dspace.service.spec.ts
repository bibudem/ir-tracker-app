import { TestBed } from '@angular/core/testing';

import { DspaceService } from './dspace.service';

describe('DspaceService', () => {
  let service: DspaceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DspaceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
