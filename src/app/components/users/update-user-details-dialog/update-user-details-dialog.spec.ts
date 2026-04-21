import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateUserDetailsDialog } from './update-user-details-dialog';

describe('UpdateUserDetailsDialog', () => {
  let component: UpdateUserDetailsDialog;
  let fixture: ComponentFixture<UpdateUserDetailsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateUserDetailsDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateUserDetailsDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
