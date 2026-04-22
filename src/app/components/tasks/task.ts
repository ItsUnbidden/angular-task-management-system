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
import { GeneralApiError, LabelResponse, TaskDeleteResponse, TaskPriority, TaskStatus, TaskUpdateRequest, TaskUpdateStatusRequest } from '../../models';
import { TaskService } from '../../service/task.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EMPTY, map, switchMap } from 'rxjs';
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
import { getChipColor, getChipText, toLocalDateString } from '../../utils';
import { ConfirmDialog } from '../util/confirm-dialog/confirm-dialog';
import { title } from 'process';

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
  readonly currentProjectRole = this.projectService.currentProjectRole;
  readonly isTaskLoading = this.taskService.isLoadingSelectedTask;
  readonly isLoadingLabels = signal(false);
  readonly isDropboxConnected = this.oauth2Service.isDropboxConnected;

  readonly projectLoadingError = this.projectService.error;
  readonly taskLoadingError = this.taskService.selectedTaskLoadingError;

  readonly isEditingName = signal(false);
  readonly isEditingDescription = signal(false);
  readonly isEditingDate = signal(false);
  readonly isEditingChips = signal(false);

  readonly isCreator = this.projectService.isCreator;
  readonly isAdmin = this.projectService.isAdmin;
  readonly isContributor = this.projectService.isContributor;

  readonly isManager = this.userService.isManager;

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

  constructor(private snackBar: MatSnackBar, private dialog: MatDialog, private router: Router) {
    effect(() => {
      const taskId = this.taskId();

      this.handleCacheSelectedTask(taskId);
    });

    effect(() => {
      const task = this.task();

      if (task) {
        this.loadLabelsForTask(task.id);

        untracked(() => {
          if (this.projectService.project()?.id !== task.projectId) {
            this.projectService.loadProjectToCache(task.projectId).subscribe();
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
        this.handleUpdateSelectedTask(request);
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
        this.handleUpdateSelectedTask(request);
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
    const newDueDate = toLocalDateString(this.dateEditForm.value.taskDueDate ?? null);

    if (task && newDueDate !== task.dueDate) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.dueDate = newDueDate;
        this.handleUpdateSelectedTask(request);
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
        this.handleUpdateSelectedTask(request);
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
      
      this.handleUpdateSelectedTask(request);
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
            this.handleCacheSelectedTask(taskId);
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

  onJoinDropbox() {
    const project = this.project();

    if (project) {         
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Join Dropbox',
          message: `Are you sure you want to <strong>join</strong> Dropbox in this project? It might take a <strong>significant</strong> amount of time and can't be reversed.`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed()
      .subscribe(
        confirmed => {
          if (confirmed) {
            this.projectService.joinDropbox(project.id).subscribe({
              next: () => {
                this.projectService.loadProjectToCache(project.id).subscribe({
                  error: (err: HttpErrorResponse) => {
                    const error = err.error as GeneralApiError;

                    if (error) {
                      this.snackBar.open(error ? `Error: ${error.errors[0]}` : 'Unknown error occured while trying to load the project.', 'Dismiss', {
                        duration: 5000
                      });
                    }
                  }
                });
              },
              error: (err: HttpErrorResponse) => {
                const error = err.error as GeneralApiError;

                this.snackBar.open(error ? `Error: ${error.errors[0]}` : 'Unknown error occured while joining Dropbox in this project.', 'Dismiss', {
                  duration: 5000
                });
              }
            });     
          }
        }
      );
    }
  }

  onTaskDelete() {
    const task = this.task();

    if (task) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Delete task',
          message: `Are you sure you want to delete task <strong>${task.name}</strong>?`
        },
        disableClose: true,
        width: '480px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) {
          this.isTaskLoading.set(true);
          return this.taskService.deleteTask(task.id);
        }
        return EMPTY;
      }))
      .subscribe({
        next: response => {
          this.snackBar.open(this.getTaskDeleteMessage(response), 'Dismiss', {
            duration: 10000
          });
          this.isTaskLoading.set(false);
          this.task.set(null);
          this.router.navigateByUrl(`/projects/${task.projectId}`);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.errors[0] : `Unknown error occured while attempting to delete task ${task.name}.`);
          this.isTaskLoading.set(false);
        }
      });
    }
  }

  onCloseEditing() {
    this.isEditingDate.set(false);
    this.isEditingName.set(false);
    this.isEditingDescription.set(false);
    this.isEditingChips.set(false);
  }

  onTryAgain() {
    this.handleCacheSelectedTask(this.taskId());
  }

  getChipColorLocal(value: string | null): string {
    return getChipColor(value);
  }

  getChipTextLocal(value: string | null): string {
    return getChipText(value);
  }

  private handleCacheSelectedTask(taskId: number) {
    this.taskService.cacheSelectedTask(taskId).subscribe();
  }

  private handleUpdateSelectedTask(request: TaskUpdateRequest | TaskUpdateStatusRequest) {
    this.taskService.updateCachedTask(request)?.subscribe();
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

        this.snackBar.open(error ? `Error: ${error.errors[0]}` : 'Unknown error occured while loading labels.', 'Dismiss', {
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

        this.snackBar.open(error ? `Error: ${error.errors[0]}` : 'Unknown error occured while loading project labels.', 'Dismiss', {
          duration: 5000
        })
        this.isLoadingLabels.set(false);
      }
    })
  }

  private getTaskDeleteMessage(response: TaskDeleteResponse) : string {
    let message = `Task ${response.taskName} has been successfully deleted.`;
    if (response.dropboxFolderDeleted.status === 'SKIPPED') {
      message += ' An error occured while deleting the task\'s Dropbox folder. You might have to delete it manually.';
    } else if (response.dropboxFolderDeleted.status === 'FAILED') {
      message += ' Was not able to delete the task\'s Dropbox folder, because your account is not connected to Dropbox. It should be deleted manually.'
    }
    if (response.dropboxFolderDeleted.status === 'SKIPPED') {
      message += ' An error occured while deleting the task\'s Calendar events. You might have to delete them manually.';
    } else if (response.dropboxFolderDeleted.status === 'FAILED') {
      message += ' Was not able to delete the task\'s Calendar events, because your account is not connected to Dropbox. They should be deleted manually.'
    }
    return message;
  }
}
