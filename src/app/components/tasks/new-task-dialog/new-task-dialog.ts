import { Component, inject, Inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
import { getDefaultErrorMessageForType } from '../../../utils';
import { MatChipsModule } from '@angular/material/chips';
import { LabelStore } from '../../../cache/label.store';
import { EMPTY, switchMap } from 'rxjs';
import { ProjectStore } from '../../../cache/project.store';
import { NewLabelDialog } from '../../label/new-label-dialog/new-label-dialog';
import { ValidationBoundaries } from '../../validation-boundaries';

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
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule,
            ReactiveFormsModule, MatNativeDateModule, MatDatepickerModule,
            MatButtonModule, MatIconModule, MatSelectModule,
            MatProgressSpinnerModule, MatChipsModule],
  templateUrl: './new-task-dialog.html',
  styleUrl: './new-task-dialog.css',
})
export class NewTaskDialog {
  protected readonly NAME_MAX_LENGTH = ValidationBoundaries.TASK_NAME_MAX_LENGTH;
  protected readonly NAME_MIN_LENGTH = ValidationBoundaries.TASK_NAME_MIN_LENGTH;
  protected readonly DESCRIPTION_MAX_LENGTH = ValidationBoundaries.TASK_DESCRIPTION_MAX_LENGTH;

  private readonly projectStore = inject(ProjectStore);
  protected readonly labelStore = inject(LabelStore);

  protected readonly error = signal('');
  protected readonly isSendingRequest = signal(false);

  protected readonly taskForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(ValidationBoundaries.TASK_NAME_MIN_LENGTH),
      Validators.maxLength(ValidationBoundaries.TASK_NAME_MAX_LENGTH)
    ]),
    description: new FormControl('', [
      Validators.maxLength(ValidationBoundaries.TASK_DESCRIPTION_MAX_LENGTH)
    ]),
    priority: new FormControl('MEDIUM', [
      Validators.required
    ]),
    dueDate: new FormControl<Date | null>(null),
    assignee: new FormControl<UserResponse | null>(null),
    labels: new FormControl<number[]>([], { nonNullable: true })
  });

  protected readonly priorityOptions: TaskPriorityOption[] = [
    { priority: 'LOW', priorityView: 'Low' },
    { priority: 'MEDIUM', priorityView: 'Medium' },
    { priority: 'HIGH', priorityView: 'High' },
  ];

  constructor(private readonly dialogRef: MatDialogRef<NewTaskDialog, boolean>,
              private readonly dialog: MatDialog,
              private readonly taskService: TaskService,
              @Inject(MAT_DIALOG_DATA) public readonly data: NewTaskDialogData) {}

  protected close(): void {
    this.dialogRef.close();
  }

  protected submit(): void {
    if (this.taskForm.valid) {
      const request: TaskCreateRequest = {
        name: this.taskForm.get('name')?.value || '',
        description: this.taskForm.get('description')?.value || undefined,
        priority: this.taskForm.value.priority as TaskPriority || 'MEDIUM',
        dueDate: this.toLocalDateString(this.taskForm.value.dueDate || null),
        projectId: this.data.projectId,
        assigneeId: Number(this.taskForm.value.assignee?.id),
        labelIds: this.taskForm.value.labels || []
      };
      this.isSendingRequest.set(true);
      this.taskService.createTask(request).pipe(
        switchMap(() => this.labelStore.cacheLabelsForProject(this.data.projectId, true))).subscribe({
        next: () => {
          this.isSendingRequest.set(false);
          this.dialogRef.close(true);
        },
        error: (err) => {
          const error = err.error as GeneralApiError;
                    
          this.error.set(getDefaultErrorMessageForType(error));

          this.isSendingRequest.set(false);
        }
      })
    }
  }

  protected onAddNewLabel() {
    const project = this.projectStore.selectedProjectCache()?.item;

    if (project) {
      this.dialog.open(NewLabelDialog, {
        data: {
          projectId: project.id
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) {
          return this.labelStore.cacheLabelsForProject(project.id, true);
        }        
        return EMPTY;
      }))
      .subscribe();
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
