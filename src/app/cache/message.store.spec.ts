import { TestBed } from '@angular/core/testing';

import { MessageStore } from './message.store';

describe('MessageStore', () => {
  let service: MessageStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
