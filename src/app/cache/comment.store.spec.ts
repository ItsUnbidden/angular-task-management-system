import { TestBed } from '@angular/core/testing';

import { CommentStore } from './comment.store';

describe('CommentStore', () => {
  let service: CommentStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommentStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
