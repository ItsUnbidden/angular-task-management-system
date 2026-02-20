import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewProjectDialog } from './new-project-dialog';

describe('NewProjectDialog', () => {
  let component: NewProjectDialog;
  let fixture: ComponentFixture<NewProjectDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewProjectDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewProjectDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
