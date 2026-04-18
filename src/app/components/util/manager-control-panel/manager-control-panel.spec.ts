import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerControlPanel } from './manager-control-panel';

describe('ManagerControlPanel', () => {
  let component: ManagerControlPanel;
  let fixture: ComponentFixture<ManagerControlPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerControlPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerControlPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
