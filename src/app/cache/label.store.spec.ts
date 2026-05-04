import { TestBed } from '@angular/core/testing';

import { LabelStore } from './label.store';

describe('LabelStore', () => {
  let service: LabelStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LabelStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
