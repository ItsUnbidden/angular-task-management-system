import { TestBed } from '@angular/core/testing';

import { ReplyStore } from './reply.store';

describe('ReaplyStore', () => {
  let service: ReplyStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReplyStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
