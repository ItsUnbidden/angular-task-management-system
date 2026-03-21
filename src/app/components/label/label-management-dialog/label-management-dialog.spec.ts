import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelManagementDialog } from './label-management-dialog';

describe('LabelManagementDialog', () => {
  let component: LabelManagementDialog;
  let fixture: ComponentFixture<LabelManagementDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelManagementDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabelManagementDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
