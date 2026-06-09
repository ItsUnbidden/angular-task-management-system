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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EMPTY, map, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from "@angular/material/chips";
import { MatSelectModule } from "@angular/material/select";
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { NewLabelDialog } from '../label/new-label-dialog/new-label-dialog';
import { LabelManagementDialog } from '../label/label-management-dialog/label-management-dialog';
import { MessageList } from "../messages/message-list/message-list";
import { AttachmentList } from "../attachments/attachment-list/attachment-list";
import { OAuth2Service } from '../../service/oauth2.service';
import { getChipColor, getChipTextKey, getDefaultErrorMessageForType, getDefaultMessageForExternalError, toLocalDateString } from '../../utils';
import { ConfirmDialog } from '../util/confirm-dialog/confirm-dialog';
import { ProjectStore } from '../../cache/project.store';
import { TaskStore } from '../../cache/task.store';
import { UserStore } from '../../cache/user.store';
import { LabelStore } from '../../cache/label.store';
import { ValidationBoundaries } from '../validation-boundaries';
import { TaskStatus, TaskUpdateRequest, TaskPriority } from '../../models/task.model';
import { GeneralApiError } from '../../models/error.model';
import { Project } from '../projects/project';
import { ThirdPartyOperationStatus } from '../../models/external.model';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-task',
  imports: [CommonModule, RouterModule, MatProgressSpinnerModule,
    MatInputModule, MatButtonModule, MatIconModule,
    MatCardModule, MatDividerModule, MatFormFieldModule,
    MatNativeDateModule, MatDatepickerModule, ReactiveFormsModule,
    MatChipsModule, MatSelectModule, MessageList,
    AttachmentList, TranslatePipe],
  templateUrl: './task.html',
  styleUrl: './task.css',
})
export class Task {
  protected readonly NAME_MAX_LENGTH = ValidationBoundaries.TASK_NAME_MAX_LENGTH;
  protected readonly NAME_MIN_LENGTH = ValidationBoundaries.TASK_NAME_MIN_LENGTH;
  protected readonly DESCRIPTION_MAX_LENGTH = ValidationBoundaries.TASK_DESCRIPTION_MAX_LENGTH;

  private readonly projectStore = inject(ProjectStore);
  private readonly taskStore = inject(TaskStore);
  private readonly userStore = inject(UserStore);
  private readonly labelStore = inject(LabelStore);
  private readonly oauth2Service = inject(OAuth2Service);

  protected readonly route = inject(ActivatedRoute);

  private readonly taskId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('taskId')))), { initialValue: 0 }
  );

  protected readonly selectedProjectCache = this.projectStore.selectedProjectCache.asReadonly();
  protected readonly selectedTaskCache = this.taskStore.selectedTaskCache.asReadonly();
  protected readonly selectedTaskLabels = this.labelStore.selectedTaskLabels;
  protected readonly projectLabels = this.labelStore.cache.asReadonly();
  protected readonly currentUserCache = this.userStore.userCache.asReadonly();
  protected readonly isDropboxConnected = this.oauth2Service.isDropboxConnected.asReadonly();
  protected readonly currentProjectRole = this.projectStore.currentProjectRole;

  protected readonly isEditingName = signal(false);
  protected readonly isEditingDescription = signal(false);
  protected readonly isEditingDate = signal(false);
  protected readonly isEditingChips = signal(false);

  protected readonly isCreator = this.projectStore.isCreator;
  protected readonly isAdmin = this.projectStore.isAdmin;
  protected readonly isContributor = this.projectStore.isContributor;

  protected readonly isManager = this.userStore.isManager;

  protected readonly nameEditForm = new FormGroup({
    taskName: new FormControl('', { nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(ValidationBoundaries.TASK_NAME_MIN_LENGTH),
        Validators.maxLength(ValidationBoundaries.TASK_NAME_MAX_LENGTH)
      ]
    })
  });

  protected readonly descriptionEditForm = new FormGroup({
    taskDescription: new FormControl('', {
      validators: [
        Validators.maxLength(ValidationBoundaries.TASK_DESCRIPTION_MAX_LENGTH)
      ]})
  });

  protected readonly dateEditForm = new FormGroup({
    taskDueDate: new FormControl<Date | null>(null)
  });

  protected readonly chipsEditForm = new FormGroup({
    taskPriority: new FormControl<TaskPriority>('MEDIUM', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    }),
    labels: new FormControl<number[]>([], { nonNullable: true })
  });

  protected readonly priorityOptions: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

  constructor(private readonly project: Project,
              private readonly notification: NotificationService,
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

  protected onSubmitTaskName() {
    const task = this.selectedTaskCache()?.item;
    const newName = this.nameEditForm.value.taskName;

    if (task && newName && task.name !== newName) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.name = newName;
        this.taskStore.updateCachedTask(request).subscribe({
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.notification.info(getDefaultErrorMessageForType(error), 10000);
          }
        });
      }
    }
    this.isEditingName.set(false);
  }

  protected onTaskNameEdit() {
    this.isEditingName.set(true);

    this.isEditingDescription.set(false);
    this.isEditingDate.set(false);
  }

  protected onSubmitTaskDescription() {
    const task = this.selectedTaskCache()?.item;
    const newDescription = this.descriptionEditForm.value.taskDescription;

    if (task && newDescription !== task.description) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.description = newDescription ?? undefined;
        this.taskStore.updateCachedTask(request).subscribe({
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.notification.info(getDefaultErrorMessageForType(error), 10000);
          }
        });
      }
    }
    this.isEditingDescription.set(false);
  }

  protected onTaskDescriptionEdit() {
    this.isEditingDescription.set(true);

    this.isEditingName.set(false);
    this.isEditingDate.set(false);
  }

  protected onSubmitTaskDueDate() {
    const task = this.selectedTaskCache()?.item;
    const newDueDate = toLocalDateString(this.dateEditForm.value.taskDueDate ?? null);

    if (task && newDueDate !== task.dueDate) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.dueDate = newDueDate;
        this.taskStore.updateCachedTask(request).subscribe({
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.notification.info(getDefaultErrorMessageForType(error), 10000);
          }
        });
      }
    }
    this.isEditingDate.set(false);
  }

  protected onTaskDueDateEdit() {
    this.isEditingDate.set(true);

    this.isEditingName.set(false);
    this.isEditingDescription.set(false);
  }

  protected onSubmitTaskChips() {
    const newPriority = this.chipsEditForm.value.taskPriority;

    if (newPriority) {
      const request = this.makeTaskUpdateRequest();

      if (request) {
        request.priority = newPriority;
        request.labelIds = this.chipsEditForm.value.labels ?? [];
        this.taskStore.updateCachedTask(request).pipe(switchMap((task) => {
          return this.labelStore.cacheLabelsForProject(task.projectId, true);
        })).subscribe({
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.notification.info(getDefaultErrorMessageForType(error), 10000);
          }
        });
      }
    }
    this.isEditingChips.set(false);
  }

  protected onTaskChipsEdit() {
    this.isEditingChips.set(true);

    this.isEditingName.set(false);
    this.isEditingDescription.set(false);
    this.isEditingDate.set(false);
  }

  protected onStatusChange(newStatus: TaskStatus) {
    const task = this.selectedTaskCache()?.item;

    if (task) {
      const request = { newStatus: newStatus };
      
      this.taskStore.updateCachedTask(request).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
  }

  protected onAddNewLabel() {
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
          return this.taskStore.cacheSelectedTask(task.id, true);
        }        
        return EMPTY;
      }))
      .subscribe();
    }
  }

  protected onOpenLabelManagement() {
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
        if (hasChangedLabels) return this.labelStore.cacheLabelsForProject(project.id, true);
        return EMPTY;
      }))
      .subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      })
    }
  }

  protected onJoinDropbox() {
    this.project.onJoinDropbox();
  }

  protected onTaskDelete() {
    const task = this.selectedTaskCache()?.item;

    if (task) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'task.confirm.delete.title' },
          message: { key: 'task.confirm.delete.message', params: { name: task.name } }
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
          this.router.navigateByUrl(`/projects/${task.projectId}`);
          if (response.dropboxFolderDeleted.status === ThirdPartyOperationStatus.SUCCESS
              || response.dropboxFolderDeleted.status === ThirdPartyOperationStatus.NOT_APPLICABLE) {
            this.notification.info('task.success.delete.full', 5000, { name: task.name });
          } else {
            this.notification.info('task.success.delete.dropboxFailed', 10000, {
              name: task.name,
              dropboxMessage: getDefaultMessageForExternalError(response.dropboxFolderDeleted)
            });
          }
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
  }

  protected onCloseEditing() {
    this.isEditingDate.set(false);
    this.isEditingName.set(false);
    this.isEditingDescription.set(false);
    this.isEditingChips.set(false);
  }

  protected onTryAgain() {
    const taskId = this.taskId();

    if (taskId) this.taskStore.cacheSelectedTask(taskId, true).subscribe();
  }

  protected getChipColorLocal(value: string | null): string {
    return getChipColor(value);
  }

  protected getChipTextLocal(value: string | null): string {
    return getChipTextKey(value);
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
}
