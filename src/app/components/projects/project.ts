import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ProjectService } from '../../service/project.service';
import { MatCardModule } from "@angular/material/card";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../util/confirm-dialog/confirm-dialog';
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDivider } from '@angular/material/divider';
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { EMPTY, map, switchMap } from 'rxjs';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatExpansionModule } from '@angular/material/expansion';
import { AddUserDialog } from '../users/add-user-dialog/add-user-dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { OAuth2Service } from '../../service/oauth2.service';
import { getChipColor, getChipTextKey, getDefaultErrorMessageForType, getDefaultMessageForExternalError, toLocalDateString } from '../../utils';
import { ProjectStore } from '../../cache/project.store';
import { UserStore } from '../../cache/user.store';
import { ValidationBoundaries } from '../../config/validation-boundaries';
import { ProjectRoleResponse, ProjectUpdateRequest, ProjectWithDropboxResultResponse } from '../../models/project.model';
import { GeneralApiError } from '../../models/error.model';
import { ThirdPartyOperationStatus } from '../../models/external.model';
import { NotificationService } from '../../service/notification.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, MatIconModule,
    MatInputModule, MatFormFieldModule, ReactiveFormsModule, MatButtonModule,
    MatSlideToggleModule, MatDatepickerModule, MatDivider, MatChipsModule,
    MatPaginatorModule, RouterOutlet, MatExpansionModule, MatSnackBarModule,
    TranslatePipe],
  templateUrl: './project.html',
  styleUrl: './project.css',
})
export class Project {
  protected readonly NAME_MAX_LENGTH = ValidationBoundaries.PROJECT_NAME_MAX_LENGTH;
  protected readonly NAME_MIN_LENGTH = ValidationBoundaries.PROJECT_NAME_MIN_LENGTH;
  protected readonly DESCRIPTION_MAX_LENGTH = ValidationBoundaries.PROJECT_DESCRIPTION_MAX_LENGTH;

  private readonly route = inject(ActivatedRoute);
  private readonly projectStore = inject(ProjectStore);
  private readonly userStore = inject(UserStore);
  private readonly oauth2Service = inject(OAuth2Service);

  protected readonly projectCache = this.projectStore.selectedProjectCache;
  protected readonly currentUser = this.userStore.userCache;
 
  protected readonly isEditingName = signal(false);
  protected readonly isEditingDescription = signal(false);
  protected readonly isEditingDates = signal(false);
  protected readonly isSavingPrivacy = signal(true);
  
  protected readonly isUserConnectedToDropbox = this.oauth2Service.isDropboxConnected;
  protected readonly isUserConnectedToCalendar = this.oauth2Service.isCalendarConnected;

  protected readonly isConnectedToDropboxInProject = this.projectStore.isConnectedToDropboxInProject;
  protected readonly isConnectedToCalendarInProject = this.projectStore.isConnectedToCalendarInProject;
  protected readonly isCreator = this.projectStore.isCreator;
  protected readonly isAdmin = this.projectStore.isAdmin;
  protected readonly isContributor = this.projectStore.isContributor;

  protected readonly isManager = this.userStore.isManager;

  protected readonly creator = computed(() => this.projectCache().item?.projectRoles.find(pr => pr.roleType === 'CREATOR') ?? null);
  protected readonly admins = computed(() => this.projectCache().item?.projectRoles.filter(pr => pr.roleType === 'ADMIN') ?? []);
  protected readonly contributors = computed(() => this.projectCache().item?.projectRoles.filter(pr => pr.roleType === 'CONTRIBUTOR') ?? []);

  private readonly projectId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('projectId')))), { initialValue: 0 }
  );

  protected readonly nameEditForm = new FormGroup({
    projectName: new FormControl('', { nonNullable: true, validators: [
      Validators.required,
      Validators.minLength(ValidationBoundaries.PROJECT_NAME_MIN_LENGTH),
      Validators.maxLength(ValidationBoundaries.PROJECT_NAME_MAX_LENGTH)
    ] })
  });

  protected readonly descriptionEditForm = new FormGroup({
    projectDescription: new FormControl('', { validators: [
      Validators.maxLength(ValidationBoundaries.PROJECT_DESCRIPTION_MAX_LENGTH)
    ] })
  });

  protected readonly datesEditForm = new FormGroup({
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null)
  })

  protected readonly isPrivateCtrl = new FormControl<boolean>(false, { nonNullable: true });

  constructor(private readonly dialog: MatDialog,
              private readonly notification: NotificationService,
              private readonly router: Router,
              private readonly projectService: ProjectService) {
    effect(() => {
      const id = this.projectId();

      this.projectStore.cacheSelectedProject(id).subscribe();
    });

    effect(() => {
      const project = this.projectCache()?.item;

      if (project) {
        this.isPrivateCtrl.setValue(project?.isPrivate ?? false);
        this.isSavingPrivacy.set(false);

        untracked(() => {
          if (!this.nameEditForm.dirty) {
            this.nameEditForm.patchValue({
              projectName: project.name
            });
          }
          if (!this.descriptionEditForm.dirty) {
            this.descriptionEditForm.patchValue({
              projectDescription: project.description
            })
          }
          if (!this.datesEditForm.dirty) {
            this.datesEditForm.patchValue({
              startDate: new Date(project.startDate ?? ''),
              endDate: new Date(project.endDate ?? '')
            });
          }
        });
      }
    });

    effect(() => {
      if (this.isSavingPrivacy()) {
        this.isPrivateCtrl.disable({ emitEvent: false });
      } else {
        this.isPrivateCtrl.enable({ emitEvent: false });
      }
    });

    effect(() => {
      const isAdmin = this.isAdmin();

      untracked(() => {
        if (isAdmin) {
          this.isPrivateCtrl.enable();
        }
        else {
          this.isPrivateCtrl.disable();
        }
      });
    });
  } 

  protected onProjectNameEdit() {
    this.isEditingName.set(true);

    this.isEditingDescription.set(false);
    this.isEditingDates.set(false);
  }

  protected onSubmitProjectName() {
    const project = this.projectCache()?.item;

    if (project && this.nameEditForm.value.projectName && this.nameEditForm.value.projectName !== project.name) {
      const request = this.makeProjectUpdateRequest();

      if (request) {
        request.name = this.nameEditForm.value.projectName;
        this.projectStore.updateCachedProject(request).subscribe({
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.notification.info(getDefaultErrorMessageForType(error), 10000);
          }
        });
      }
    }
    this.isEditingName.set(false);
  }

  protected onCloseEditing() {
    this.isEditingDescription.set(false);
    this.isEditingName.set(false);
    this.isEditingDates.set(false);
  }

  protected onProjectDescriptionEdit() {
    this.isEditingDescription.set(true);

    this.isEditingName.set(false);
    this.isEditingDates.set(false);
  }

  protected onSubmitProjectDescription() {
    const project = this.projectCache()?.item;

    if (project && this.descriptionEditForm.value.projectDescription !== project.description) {
      const request = this.makeProjectUpdateRequest();

      if (request) {
        request.description = this.descriptionEditForm.value.projectDescription ?? undefined;
        this.projectStore.updateCachedProject(request).subscribe({
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.notification.info(getDefaultErrorMessageForType(error), 10000);
          }
        });
      }
    }
    this.isEditingDescription.set(false);
  }

  protected onIsPrivateToggleChange(isOn: boolean) {
    this.isSavingPrivacy.set(true);
    this.isPrivateCtrl.setValue(!isOn, { emitEvent: false });
    this.dialog.open(ConfirmDialog, {
      data: {
        title: { key: 'project.confirm.private.title' },
        message: { key: isOn ? 'project.confirm.private.message.on' : 'project.confirm.private.message.off' }
      },
      disableClose: true,
      width: '420px'
    })
    .afterClosed()
    .pipe(switchMap(confirmed => {
      const project = this.projectCache()?.item;
      const request = this.makeProjectUpdateRequest();

      if (confirmed && project && request) {
        request.isPrivate = isOn;
        return this.projectStore.updateCachedProject(request);
      }

      this.isSavingPrivacy.set(false);
      return EMPTY;
    })).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.notification.info(getDefaultErrorMessageForType(error), 10000);
      }
    });
  }

  protected onProjectDatesEdit() {
    this.isEditingDates.set(true);

    this.isEditingDescription.set(false);
    this.isEditingName.set(false);
  }

  protected onSubmitProjectDates() {
    const project = this.projectCache()?.item;

    if (project) {
      const request = this.makeProjectUpdateRequest();

      if (request) {
        if (this.datesEditForm.value.startDate) {
          request.startDate = toLocalDateString(this.datesEditForm.value.startDate) ?? '';
        }
        request.endDate = toLocalDateString(this.datesEditForm.value.endDate ?? null);
        this.projectStore.updateCachedProject(request).subscribe({
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.notification.info(getDefaultErrorMessageForType(error), 10000);
          }
        });
      }
    }
    this.isEditingDates.set(false);
  }

  protected onAddUser() {
    this.dialog.open(AddUserDialog, {
      disableClose: true,
      width: '420px'
    }).afterClosed().subscribe({
      next: (responseUsernamePair: [ProjectWithDropboxResultResponse, string]) => {
        if (responseUsernamePair) {
          if (responseUsernamePair[0].dropboxResult.status === ThirdPartyOperationStatus.SUCCESS) {
            this.notification.info('project.success.addUser.full', 5000, {
              username: responseUsernamePair[1]
            });
          } else {
            this.notification.info('project.success.addUser.dropboxFailed', 10000, {
              username: responseUsernamePair[1],
              dropboxMessage: getDefaultMessageForExternalError(responseUsernamePair[0].dropboxResult)
            });
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.notification.info(getDefaultErrorMessageForType(error), 10000);
      }
    });
  }

  protected onRemoveUser(projectRole: ProjectRoleResponse) {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.removeUser.title', params: { username: projectRole.username } },
          message: { key: 'project.confirm.removeUser.message', params: { username: projectRole.username } }
        }
      })
      .afterClosed().pipe(
        switchMap(confirmed => {
          if (confirmed) return this.projectStore.removeUserFromProject(projectRole.userId);
          return EMPTY;
        })
      ).subscribe({
        next: response => {
          if (response.dropboxResult.status === ThirdPartyOperationStatus.SUCCESS) {
            this.notification.info('project.success.removeUser.full', 5000, {
              username: projectRole.username
            });
          } else {
            this.notification.info('project.success.removeUser.dropboxFailed', 10000, {
              username: projectRole.username,
              dropboxMessage: getDefaultMessageForExternalError(response.dropboxResult)
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

  protected onQuitProject() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.quit.title' },
          message: { key: 'project.confirm.quit.message' }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.quitProject();
        return EMPTY;
      })).subscribe({
        next: (response) => {
          this.router.navigateByUrl('/dashboard');
          if (response.dropboxResult.status === ThirdPartyOperationStatus.SUCCESS) {
            this.notification.info('project.success.quit.full', 5000, {
              projectName: project.name
            });
          } else {
            this.notification.info('project.success.quit.dropboxFailed', 10000, {
              projectName: project.name,
              dropboxMessage: getDefaultMessageForExternalError(response.dropboxResult)
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

  protected onMakeAdmin(projectRole: ProjectRoleResponse) {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.makeAdmin.title' },
          message: { key: 'project.confirm.makeAdmin.message', params: { username: projectRole.username } }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.changeMemberRole(projectRole.userId, { newRole: 'ADMIN'});
        return EMPTY;
      })).subscribe({
        next: () => {
          this.notification.info('project.success.makeAdmin', 5000, { username: projectRole.username });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
  }

  protected onRemoveAdmin(projectRole: ProjectRoleResponse) {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.removeAdmin.title' },
          message: { key: 'project.confirm.removeAdmin.message', params: { username: projectRole.username } }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.changeMemberRole(projectRole.userId, { newRole: 'CONTRIBUTOR'});
        return EMPTY;
      })).subscribe({
        next: () => {
          this.notification.info('project.success.removeAdmin', 5000, { username: projectRole.username });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
  }

  protected onTransferOwnership(projectRole: ProjectRoleResponse) {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.transfer.title' },
          message: { key: 'project.confirm.transfer.message', params: { username: projectRole.username } }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.changeMemberRole(projectRole.userId, { newRole: 'CREATOR'});
        return EMPTY;
      })).subscribe({
        next: response => {
          if (response.dropboxResult.status === ThirdPartyOperationStatus.SUCCESS) {
            this.notification.info('project.success.transfer.full', 5000, {
              username: projectRole.username
            });
          } else {
            this.notification.info('project.success.transfer.dropboxFailed', 10000, {
              username: projectRole.username,
              dropboxMessage: getDefaultMessageForExternalError(response.dropboxResult)
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

  protected onDeleteProject() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.delete.title' },
          message: { key: 'project.confirm.delete.message' }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.deleteProject();
        return EMPTY;
      })).subscribe({
        next: response => {
          this.router.navigateByUrl('/dashboard');
          if (response.dropboxResult.status === ThirdPartyOperationStatus.SUCCESS) {
            this.notification.info('project.success.delete.full', 5000, {
              projectName: project.name
            });
          } else {
            this.notification.info('project.success.delete.dropboxFailed', 10000, {
              projectName: project.name,
              dropboxMessage: getDefaultMessageForExternalError(response.dropboxResult)
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

  protected onConnectDropbox() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.connectDropbox.title' },
          message: { key: 'project.confirm.connectDropbox.message' }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.connectProjectToDropbox();
        return EMPTY;
      })).subscribe({
        next: () => {
          this.notification.info('project.success.connectDropbox', 10000);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
  }

  protected onConnectCalendar() {
    const project = this.projectCache()?.item;

    if (project) {      
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.connectCalendar.title' },
          message: { key: 'project.confirm.connectCalendar.message' }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.connectProjectToCalendar();
        return EMPTY;
      })).subscribe({
        next: () => {
          this.notification.info('project.success.connectCalendar', 10000);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });     
    }
  }

  public onJoinDropbox() {
    const project = this.projectCache()?.item;

    if (project) {         
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.joinDropbox.title' },
          message: { key: 'project.confirm.joinDropbox.message' }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(
        switchMap(confirmed => {
          if (confirmed) return this.projectStore.joinDropbox(); 
          return EMPTY;   
        })
      ).subscribe({
        next: () => {
          this.notification.info('project.success.joinDropbox', 10000);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      }); 
    }
  }

  protected onJoinCalendar() {
    const project = this.projectCache()?.item;

    if (project) {         
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.joinCalendar.title' },
          message: { key: 'project.confirm.joinCalendar.message' }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(
        switchMap(confirmed => {
          if (confirmed) return this.projectService.joinCalendar(project.id);  
          return EMPTY;
        }),
        switchMap(() => this.projectStore.cacheSelectedProject(project.id, true))
      ).subscribe({       
        next: () => {
          this.notification.info('project.success.joinCalendar', 10000);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });   
    }
  }

  protected onDisconnectDropbox() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.disconnectDropbox.title' },
          message: { key: 'project.confirm.disconnectDropbox.message' }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(
        switchMap(confirmed => {
          if (confirmed) return this.projectStore.disconnectDropbox();
          return EMPTY;
        })
      ).subscribe({
        next: response => {
          if (response.dropboxResult.status === ThirdPartyOperationStatus.SUCCESS) {
            this.notification.info('project.success.disconnectDropbox.full', 10000);
          } else {
            this.notification.info('project.success.disconnectDropbox.dropboxFailed', 10000, {
              dropboxMessage: getDefaultMessageForExternalError(response.dropboxResult)
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

  protected onDisconnectCalendar() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'project.confirm.disconnectCalendar.title' },
          message: { key: 'project.confirm.disconnectCalendar.message' }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(
        switchMap(confirmed => {
          if (confirmed) return this.projectStore.disconnectCalendar();
          return EMPTY;
        })
      ).subscribe({
        next: result => {
          const messageKey = result.status === ThirdPartyOperationStatus.SUCCESS
              ? 'project.success.disconnectCalendar.full' : 'project.success.disconnectCalendar.calendarFailed';

          this.notification.info(messageKey, 10000);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
  }

  protected onChangeStatus(status: 'IN_PROGRESS' | 'COMPLETED') {
    this.projectStore.changeStatus(status).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.notification.info(getDefaultErrorMessageForType(error), 10000);
      }
    });
  }

  protected onReload() {
    this.projectStore.cacheSelectedProject(this.projectId(), true).subscribe();
  }

  protected getChipColorLocal(value: string | null): string {
    return getChipColor(value);
  }

  protected getChipTextLocal(value: string | null): string {
    return getChipTextKey(value);
  }

  private makeProjectUpdateRequest() : ProjectUpdateRequest | undefined {
    const project = this.projectCache()?.item;

    if (!project) return undefined;
    
    return { name: project.name,
            description: project.description,
            startDate: project.startDate ?? '',
            endDate: project.endDate,
            isPrivate: project.isPrivate };
  }
}
