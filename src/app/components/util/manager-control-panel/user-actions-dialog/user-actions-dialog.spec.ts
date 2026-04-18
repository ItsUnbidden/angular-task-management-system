import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserActionsDialog } from './user-actions-dialog';

describe('UserActionsDialog', () => {
  let component: UserActionsDialog;
  let fixture: ComponentFixture<UserActionsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserActionsDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserActionsDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
