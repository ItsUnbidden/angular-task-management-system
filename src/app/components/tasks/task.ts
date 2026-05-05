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
import { GeneralApiError, LabelResponse, TaskDeleteResponse, TaskPriority, TaskStatus, TaskUpdateRequest } from '../../models';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EMPTY, forkJoin, map, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from "@angular/material/chips";
import { MatSelectModule } from "@angular/material/select";
import { ProjectService } from '../../service/project.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { NewLabelDialog } from '../label/new-label-dialog/new-label-dialog';
import { LabelManagementDialog } from '../label/label-management-dialog/label-management-dialog';
import { MessageList } from "../messages/message-list/message-list";
import { AttachmentList } from "../attachments/attachment-list/attachment-list";
import { OAuth2Service } from '../../service/oauth2.service';
import { getChipColor, getChipText, getDefaultErrorMessageForType, toLocalDateString } from '../../utils';
import { ConfirmDialog } from '../util/confirm-dialog/confirm-dialog';
import { ProjectStore } from '../../cache/project.store';
import { TaskStore } from '../../cache/task.store';
import { UserStore } from '../../cache/user.store';
import { LabelStore } from '../../cache/label.store';

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
  private readonly projectStore = inject(ProjectStore);
  private readonly taskStore = inject(TaskStore);
  private readonly userStore = inject(UserStore);
  private readonly labelStore = inject(LabelStore);
  private readonly oauth2Service = inject(OAuth2Service);

  readonly route = inject(ActivatedRoute);

  readonly taskId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('taskId')))), { initialValue: 0 }
  );

  readonly selectedProjectCache = this.projectStore.selectedProjectCache.asReadonly();
  readonly selectedTaskCache = this.taskStore.selectedTaskCache.asReadonly();
  readonly projectLabels = this.labelStore.cache.asReadonly();
  readonly currentUserCache = this.userStore.userCache.asReadonly();
  readonly isDropboxConnected = this.oauth2Service.isDropboxConnected.asReadonly();
  readonly currentProjectRole = this.projectStore.currentProjectRole;

  readonly isEditingName = signal(false);
  readonly isEditingDescription = signal(false);
  readonly isEditingDate = signal(false);
  readonly isEditingChips = signal(false);

  readonly isCreator = this.projectStore.isCreator;
  readonly isAdmin = this.projectStore.isAdmin;
  readonly isContributor = this.projectStore.isContributor;

  readonly isManager = this.userStore.isManager;

  readonly nameEditForm = new FormGroup({
    taskName: new FormControl('', { nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
      ]
    })
  });

  readonly descriptionEditForm = new FormGroup({
    taskDescription: new FormControl('', {
      validators: [
        Validators.maxLength(500)
      ]})
  });

  readonly dateEditForm = new FormGroup({
    taskDueDate: new FormControl<Date | null>(null)
  });

  readonly chipsEditForm = new FormGroup({
    taskPriority: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    }),
    labels: new FormControl<number[]>([], { nonNullable: true })
  });

  readonly priorityOptions: TaskPriorityOption[] = [
    { priority: 'LOW', priorityView: 'Low' },
    { priority: 'MEDIUM', priorityView: 'Medium' },
    { priority: 'HIGH', priorityView: 'High' }
  ];

  constructor(private readonly projectService: ProjectService,
              private readonly snackBar: MatSnackBar,
              private readonly dialog: MatDialog,
              private readonly router: Router) {
    effect(() => {
      const taskId = this.taskId();

      untracked(() => {
        this.taskStore.cacheSelectedTask(taskId).subscribe();
      })
    });

    effect(() => {
      const task = this.selectedTaskCache()?.item;

      if (task) {
        untracked(() => {
          if (this.selectedProjectCache().item?.id !== task.projectId) {
            this.projectStore.cacheSelectedProject(task.projectId).subscribe();
          }
          this.labelStore.cacheLabelsForProject(task.projectId).subscribe();

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
        });
      }
    });
  };

  onSubmitTaskName() {
    const task = this.selectedTaskCache()?.item;
    const newName = this.nameEditForm.value.taskName;

    if (task && newName && task.name !== newName) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.name = newName;
        this.taskStore.updateCachedTask(request).subscribe();
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
    const task = this.selectedTaskCache()?.item;
    const newDescription = this.descriptionEditForm.value.taskDescription;

    if (task && newDescription !== task.description) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.description = newDescription ?? undefined;
        this.taskStore.updateCachedTask(request).subscribe();
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
    const task = this.selectedTaskCache()?.item;
    const newDueDate = toLocalDateString(this.dateEditForm.value.taskDueDate ?? null);

    if (task && newDueDate !== task.dueDate) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.dueDate = newDueDate;
        this.taskStore.updateCachedTask(request).subscribe();
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
        this.taskStore.updateCachedTask(request).pipe(switchMap((task) => {
          return this.labelStore.cacheLabelsForProject(task.projectId, true);
        })).subscribe();
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
    const task = this.selectedTaskCache()?.item;

    if (task) {
      const request = { newStatus: newStatus };
      
      this.taskStore.updateCachedTask(request).subscribe();
    }
  }

  onAddNewLabel() {
    const project = this.selectedProjectCache()?.item;
    const task = this.selectedTaskCache()?.item;

    if (project && task) {
      this.dialog.open(NewLabelDialog, {
        data: {
          projectId: project.id,
          taskId: task.id
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) {
          return forkJoin([
            this.taskStore.cacheSelectedTask(task.id),
            this.labelStore.cacheLabelsForProject(project.id)
          ]);
        }        
        return EMPTY;
      }))
      .subscribe();
    }
  }

  onOpenLabelManagement() {
    const project = this.selectedProjectCache()?.item;
    const task = this.selectedTaskCache()?.item;

    if (project && task) {
      this.dialog.open(LabelManagementDialog, {
        data: {
          projectId: project.id,
          taskId: this.taskId() ?? 0
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(hasChangedLabels => {
        if (hasChangedLabels) return this.labelStore.cacheLabelsForProject(project.id);
        return EMPTY;
      }))
      .subscribe()
    }
  }

  onJoinDropbox() {
    const project = this.selectedProjectCache()?.item;

    if (project) {         
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Join Dropbox',
          message: `Are you sure you want to <strong>join</strong> Dropbox in this project? It can't be reversed.`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(
        switchMap(confirmed => {
          if (confirmed) return this.projectService.joinDropbox(project.id);
          return EMPTY;
        }),
        switchMap(() => this.projectStore.cacheSelectedProject(project.id, true))
      )
      .subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onTaskDelete() {
    const task = this.selectedTaskCache()?.item;

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
          return this.taskStore.deleteTask(task.id);
        }
        return EMPTY;
      }))
      .subscribe({
        next: response => {
          this.snackBar.open(this.getTaskDeleteMessage(response), 'Dismiss', {
            duration: 10000
          });
          this.router.navigateByUrl(`/projects/${task.projectId}`);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error));
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
    const taskId = this.taskId();

    if (taskId) this.taskStore.cacheSelectedTask(taskId, true).subscribe();
  }

  getChipColorLocal(value: string | null): string {
    return getChipColor(value);
  }

  getChipTextLocal(value: string | null): string {
    return getChipText(value);
  }

  get getLabelsForTask() : LabelResponse[] {
    return this.labelStore.getLabelsForTask(this.taskId());
  }

  private makeTaskUpdateRequest() : TaskUpdateRequest | undefined {
    const task = this.selectedTaskCache()?.item;

    if (!task) return undefined;
    
    return { name: task.name,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            newAssigneeId: task.assigneeId, 
            labelIds: task.labelIds };
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
