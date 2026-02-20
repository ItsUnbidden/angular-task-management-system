import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTaskDialog } from './new-task-dialog';

describe('NewTaskDialog', () => {
  let component: NewTaskDialog;
  let fixture: ComponentFixture<NewTaskDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTaskDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewTaskDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
