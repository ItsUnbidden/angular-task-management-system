import { TestBed } from '@angular/core/testing';

import { AttachmentStore } from './attachment.store';

describe('AttachmentsStore', () => {
  let service: AttachmentStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttachmentStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
