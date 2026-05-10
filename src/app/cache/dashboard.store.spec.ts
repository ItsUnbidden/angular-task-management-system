import { TestBed } from '@angular/core/testing';

import { DashboardStore } from './dashboard.store';

describe('DashboardStore', () => {
  let service: DashboardStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
