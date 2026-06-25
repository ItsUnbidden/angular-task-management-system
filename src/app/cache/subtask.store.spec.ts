import { TestBed } from '@angular/core/testing';

import { SubtaskStore } from './subtask.store';

describe('SubtaskStore', () => {
  let service: SubtaskStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubtaskStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
