import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewLabelDialog } from './new-label-dialog';

describe('NewLabelDialog', () => {
  let component: NewLabelDialog;
  let fixture: ComponentFixture<NewLabelDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewLabelDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewLabelDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
