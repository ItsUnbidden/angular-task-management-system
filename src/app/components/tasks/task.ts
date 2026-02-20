import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TaskPriority, TaskResponse, TaskStatus, TaskUpdateRequest } from '../../models';
import { TaskService } from '../../service/task.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from "@angular/material/chips";
import { MatSelectModule } from "@angular/material/select";

interface TaskPriorityOption {
  priority: TaskPriority;
  priorityView: string;
}

@Component({
  selector: 'app-task',
  imports: [CommonModule, RouterModule, MatProgressSpinnerModule,
    MatInputModule, MatButtonModule, MatIconModule,
    MatCardModule, MatDividerModule, MatFormFieldModule,
    MatNativeDateModule, MatDatepickerModule, ReactiveFormsModule,
    MatChipsModule, MatSelectModule ],
  templateUrl: './task.html',
  styleUrl: './task.css',
})
export class Task {
  route: ActivatedRoute = inject(ActivatedRoute);

  taskId = toSignal(this.route.paramMap.pipe(map(p => Number(p.get('taskId')))), { initialValue: 0 });

  task = signal<TaskResponse | null>(null);
  isTaskLoading = signal(false);

  isEditingName = signal(false);
  isEditingDescription = signal(false);
  isEditingDate = signal(false);
  isEditingChips = signal(false);

  nameEditForm = new FormGroup({
    taskName: new FormControl('', { nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
      ]
    })
  })

  descriptionEditForm = new FormGroup({
    taskDescription: new FormControl('', {
      validators: [
        Validators.maxLength(500)
      ]})
  })

  dateEditForm = new FormGroup({
    taskDueDate: new FormControl<Date | null>(null)
  })

  priorityEditForm = new FormGroup({
    taskPriority: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    })
  })

  priorityOptions: TaskPriorityOption[] = [
    { priority: 'LOW', priorityView: 'Low' },
    { priority: 'MEDIUM', priorityView: 'Medium' },
    { priority: 'HIGH', priorityView: 'High' },
  ]

  constructor(private taskService: TaskService) {
    effect(() => {
      this.taskService.cacheSelectedTask(this.taskId());
    });

    effect(() => {
      const task = this.task();

      if (task) {
        untracked(() => {
          if (!this.nameEditForm.dirty) {
            this.nameEditForm.patchValue({
              taskName: task.name
            })
          }
          if (!this.descriptionEditForm.dirty) {
            this.descriptionEditForm.patchValue({
              taskDescription: task.description
            })
          }
          if (!this.dateEditForm.dirty) {
            this.dateEditForm.patchValue({
              taskDueDate: new Date(task.dueDate ?? '')
            })
          }
          if (!this.priorityEditForm.dirty) {
            this.priorityEditForm.patchValue({
              taskPriority: task.priority,
            })
          }
        })
      }
    })

    this.task = this.taskService.selectedTask;
    this.isTaskLoading = this.taskService.isLoadingSelectedTask;
  };

  onSubmitTaskName() {
    const task = this.task();
    const newName = this.nameEditForm.value.taskName;

    if (task && newName && task.name !== newName) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.name = newName;
        this.taskService.updateCachedTask(request);
      }
    }
    this.isEditingName.set(false);
  }

  onTaskNameEdit() {
    this.isEditingName.set(true);

    this.isEditingDescription.set(false);
    this.isEditingDate.set(false);
  }

  onSubmitTaskDescription() {
    const task = this.task();
    const newDescription = this.descriptionEditForm.value.taskDescription;

    if (task && newDescription !== task.description) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.description = newDescription ?? undefined;
        this.taskService.updateCachedTask(request);
      }
    }
    this.isEditingDescription.set(false);
  }

  onTaskDescriptionEdit() {
    this.isEditingDescription.set(true);

    this.isEditingName.set(false);
    this.isEditingDate.set(false);
  }

  onSubmitTaskDueDate() {
    const task = this.task();
    const newDueDate = this.toLocalDateString(this.dateEditForm.value.taskDueDate ?? null);

    if (task && newDueDate !== task.dueDate) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.dueDate = newDueDate;
        this.taskService.updateCachedTask(request);
      }
    }
    this.isEditingDate.set(false);
  }

  onTaskDueDateEdit() {
    this.isEditingDate.set(true);

    this.isEditingName.set(false);
    this.isEditingDescription.set(false);
  }

  onSubmitTaskPriority() {
    const task = this.task();
    const newPriority = this.priorityEditForm.value.taskPriority;

    if (newPriority) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.priority = newPriority as TaskPriority;
        this.taskService.updateCachedTask(request);
      }
    }
    this.isEditingChips.set(false);
  }

  onTaskChipsEdit() {
    this.isEditingChips.set(true);

    this.isEditingName.set(false);
    this.isEditingDescription.set(false);
    this.isEditingDate.set(false);
  }

  onStatusChange(newStatus: TaskStatus) {
    const task = this.task();

    if (task) {
      const request = { newStatus: newStatus };
      
      this.taskService.updateCachedTask(request);
    }
  }

  onCloseEditing() {
    this.isEditingDate.set(false);
    this.isEditingName.set(false);
    this.isEditingDescription.set(false);
    this.isEditingChips.set(false);
  }

  parseEnumColor(key: string | null): string {
    switch (key) {
      case 'INITIATED': return 'status-initiated';
      case 'NOT_STARTED': return 'status-initiated';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'COMPLETED': return 'status-completed';
      case 'OVERDUE': return 'status-overdue';
      case 'LOW': return 'priority-low';
      case 'MEDIUM': return 'priority-medium';
      case 'HIGH': return 'priority-high';
      default: return '';
    }
  }

  parseEnumText(key: string | null): string {
    switch (key) {
      case 'INITIATED': return 'Initiated';
      case 'NOT_STARTED': return 'Not started';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'OVERDUE': return 'Overdue';
      case 'LOW': return 'Low';
      case 'MEDIUM': return 'Medium';
      case 'HIGH': return 'High';
      default: return '';
    }
  }

  private makeTaskUpdateRequest() : TaskUpdateRequest | undefined {
    const task = this.task();

    if (!task) return undefined;
    
    return { name: task.name,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            newAssigneeId: task.assigneeId };
  }
  
  private toLocalDateString(date: Date | null): string | undefined {
    if (!date) {
      return undefined;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
