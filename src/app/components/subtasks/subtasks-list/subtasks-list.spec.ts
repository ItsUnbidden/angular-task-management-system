import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubtasksList } from './subtasks-list';

describe('SubtasksList', () => {
  let component: SubtasksList;
  let fixture: ComponentFixture<SubtasksList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubtasksList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubtasksList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
