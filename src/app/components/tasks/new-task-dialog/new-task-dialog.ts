import { Component, Inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { EssentialUserResponse, GeneralApiError, TaskCreateRequest, TaskPriority, UserResponse } from '../../../models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from "@angular/material/select";
import { TaskService } from '../../../service/task.service';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

interface TaskPriorityOption {
  priority: TaskPriority;
  priorityView: string;
}

export interface NewTaskDialogData {
  projectMembers: EssentialUserResponse[];
  projectId: number;
}

@Component({
  selector: 'app-new-task-dialog',
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatNativeDateModule, MatDatepickerModule, MatButtonModule, MatIconModule, MatSelectModule, MatProgressSpinnerModule],
  templateUrl: './new-task-dialog.html',
  styleUrl: './new-task-dialog.css',
})
export class NewTaskDialog {
  readonly error = signal('');
  readonly isSendingRequest = signal(false);

  readonly taskControl = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50)
    ]),
    description: new FormControl('', [
      Validators.maxLength(500)
    ]),
    priority: new FormControl('', [
      Validators.required
    ]),
    dueDate: new FormControl<Date | null>(null),
    assignee: new FormControl<UserResponse | null>(null)
  });

  readonly priorityOptions: TaskPriorityOption[] = [
    { priority: 'LOW', priorityView: 'Low' },
    { priority: 'MEDIUM', priorityView: 'Medium' },
    { priority: 'HIGH', priorityView: 'High' },
  ]

  constructor(private readonly dialogRef: MatDialogRef<NewTaskDialog, boolean>,
              private readonly taskService: TaskService,
              @Inject(MAT_DIALOG_DATA) public readonly data: NewTaskDialogData) {}

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.taskControl.valid) {
      const request: TaskCreateRequest = {
        name: this.taskControl.get('name')?.value || '',
        description: this.taskControl.get('description')?.value || undefined,
        priority: this.taskControl.get('priority')?.value as TaskPriority,
        dueDate: this.toLocalDateString(this.taskControl.get('dueDate')?.value ?? null),
        projectId: this.data.projectId,
        assigneeId: Number(this.taskControl.get('assignee')?.value?.id),
      };
      this.isSendingRequest.set(true);
      this.taskService.createTask(request).subscribe({
        next: () => {
          this.isSendingRequest.set(false);
          this.dialogRef.close(true);
        },
        error: (err) => {
          const error = err.error as GeneralApiError;
                    
          this.error.set(error ? error.errors[0] : 'Unknown error occured while attempting to create a new task.');

          this.isSendingRequest.set(false);
        }
      })
    }
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
