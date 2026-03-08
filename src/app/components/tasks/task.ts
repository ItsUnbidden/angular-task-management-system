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
import { GeneralApiError, LabelResponse, TaskPriority, TaskStatus, TaskUpdateRequest } from '../../models';
import { TaskService } from '../../service/task.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from "@angular/material/chips";
import { MatSelectModule } from "@angular/material/select";
import { UserService } from '../../service/user.service';
import { ProjectService } from '../../service/project.service';
import { LabelService } from '../../service/label.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { NewLabelDialog } from '../label/new-label-dialog/new-label-dialog';
import { LabelManagementDialog } from '../label/label-management-dialog/label-management-dialog';
import { MessageList } from "../messages/message-list/message-list";
import { AttachmentList } from "../attachments/attachment-list/attachment-list";
import { OAuth2Service } from '../../service/oauth2.service';

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
    MatChipsModule, MatSelectModule, MessageList, AttachmentList],
  templateUrl: './task.html',
  styleUrl: './task.css',
})
export class Task {
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private userService = inject(UserService);
  private labelService = inject(LabelService);
  private oauth2Service = inject(OAuth2Service);

  route = inject(ActivatedRoute);

  readonly taskId = toSignal(this.route.paramMap.pipe(map(p => Number(p.get('taskId')))), { initialValue: 0 });

  readonly project = this.projectService.project;
  readonly task = this.taskService.selectedTask;
  readonly labels = signal<LabelResponse[]>([]);
  readonly projectLabels = signal<LabelResponse[]>([]);
  readonly currentUser = this.userService.user;
  readonly isTaskLoading = this.taskService.isLoadingSelectedTask;
  readonly isLoadingLabels = signal(false);
  readonly isDropboxConnected = this.oauth2Service.isDropboxConnected;

  readonly isEditingName = signal(false);
  readonly isEditingDescription = signal(false);
  readonly isEditingDate = signal(false);
  readonly isEditingChips = signal(false);

  readonly isCreator = this.projectService.isCreator;
  readonly isAdmin = this.projectService.isAdmin;
  readonly isContributor = this.projectService.isContributor;

  nameEditForm = new FormGroup({
    taskName: new FormControl('', { nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
      ]
    })
  });

  descriptionEditForm = new FormGroup({
    taskDescription: new FormControl('', {
      validators: [
        Validators.maxLength(500)
      ]})
  });

  dateEditForm = new FormGroup({
    taskDueDate: new FormControl<Date | null>(null)
  });

  chipsEditForm = new FormGroup({
    taskPriority: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    }),
    labels: new FormControl<number[]>([], { nonNullable: true })
  });

  priorityOptions: TaskPriorityOption[] = [
    { priority: 'LOW', priorityView: 'Low' },
    { priority: 'MEDIUM', priorityView: 'Medium' },
    { priority: 'HIGH', priorityView: 'High' }
  ];

  constructor(private snackBar: MatSnackBar, private dialog: MatDialog) {
    effect(() => {
      const taskId = this.taskId();

      this.taskService.cacheSelectedTask(taskId);
    });

    effect(() => {
      const task = this.task();

      if (task) {
        this.loadLabelsForTask(task.id);

        untracked(() => {
          if (this.projectService.project()?.id !== task.projectId) {
            this.projectService.loadProjectToCache(task.projectId);
          }

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
          this.chipsEditForm.patchValue({
            taskPriority: task.priority,
            labels: task.labelIds
          })
        })
      }
    });

    effect(() => {
      const project = this.project();

      if (project) {
        this.loadLabelsForProject(project.id);
      }
    })
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

  onSubmitTaskChips() {
    const newPriority = this.chipsEditForm.value.taskPriority;

    if (newPriority) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.priority = newPriority as TaskPriority;
        request.labelIds = this.chipsEditForm.value.labels ?? [];
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

  onAddNewLabel() {
    const project = this.project();
    const task = this.task();

    if (project && task) {
      this.dialog.open(NewLabelDialog, {
        data: {
          projectId: project.id,
          taskId: task.id
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          const taskId = this.taskId();
          const project = this.project();
  
          if (taskId) {
            this.taskService.cacheSelectedTask(taskId);
          }
          if (project) {
            this.loadLabelsForProject(project.id);
          }
        }
      })
    }
  }

  onOpenLabelManagement() {
    const project = this.project();

    if (project) {
      this.dialog.open(LabelManagementDialog, {
        data: {
          projectId: project.id,
          taskId: this.taskId() ?? 0
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed()
      .subscribe({
        next: hasChangedLabels => {
          if (hasChangedLabels) {
            this.loadLabelsForProject(project.id);
            this.loadLabelsForTask(this.taskId());
          }
        }
      })
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
            newAssigneeId: task.assigneeId, 
            labelIds: task.labelIds };
  }

  private loadLabelsForTask(taskId: number) {
    this.isLoadingLabels.set(true);
    this.labelService.getLabelsForTask(taskId).subscribe({
      next: labels => {
        this.labels.set(labels);
        this.isLoadingLabels.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(error ? `Error: ${error.error}` : 'Unknown error occured while loading labels.', 'Dismiss', {
          duration: 5000
        })
        this.isLoadingLabels.set(false);
      }
    });
  }

  private loadLabelsForProject(projectId: number) {
    this.isLoadingLabels.set(true);
    this.labelService.getLabelsForProject(projectId).subscribe({
      next: labels => {
        this.projectLabels.set(labels);
        this.isLoadingLabels.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(error ? `Error: ${error.error}` : 'Unknown error occured while loading project labels.', 'Dismiss', {
          duration: 5000
        })
        this.isLoadingLabels.set(false);
      }
    })
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
