import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskGrid } from './task-grid';

describe('TaskGrid', () => {
  let component: TaskGrid;
  let fixture: ComponentFixture<TaskGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
