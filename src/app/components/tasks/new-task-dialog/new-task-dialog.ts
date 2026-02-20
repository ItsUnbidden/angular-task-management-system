import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { EssentialUserResponse, TaskCreateRequest, TaskPriority, UserResponse } from '../../../models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from "@angular/material/select";

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
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatNativeDateModule, MatDatepickerModule, MatButtonModule, MatIconModule, MatSelectModule],
  templateUrl: './new-task-dialog.html',
  styleUrl: './new-task-dialog.css',
})
export class NewTaskDialog {
  taskControl = new FormGroup({
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

  priorityOptions: TaskPriorityOption[] = [
    { priority: 'LOW', priorityView: 'Low' },
    { priority: 'MEDIUM', priorityView: 'Medium' },
    { priority: 'HIGH', priorityView: 'High' },
  ]

  constructor(private dialogRef: MatDialogRef<NewTaskDialog, TaskCreateRequest>, @Inject(MAT_DIALOG_DATA) public data: NewTaskDialogData) {}

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.taskControl.valid) {
      const result: TaskCreateRequest = {
        name: this.taskControl.get('name')?.value || '',
        description: this.taskControl.get('description')?.value || undefined,
        priority: this.taskControl.get('priority')?.value as TaskPriority,
        dueDate: this.toLocalDateString(this.taskControl.get('dueDate')?.value ?? null),
        projectId: this.data.projectId,
        assigneeId: Number(this.taskControl.get('assignee')?.value?.id),
      };
      this.dialogRef.close(result);
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
