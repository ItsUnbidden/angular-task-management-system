import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ProjectService } from '../../service/project.service';
import { GeneralApiError, ProjectRoleResponse, ProjectUpdateRequest } from '../../models';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { OAuth2Service } from '../../service/oauth2.service';
import { getChipColor, getChipText, getDefaultErrorMessageForType, toLocalDateString } from '../../utils';
import { ProjectStore } from '../../cache/project.store';
import { UserStore } from '../../cache/user.store';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, MatCardModule,
    MatProgressSpinnerModule, MatIconModule,
    MatInputModule, MatFormFieldModule,
    ReactiveFormsModule, MatButtonModule,
    MatSlideToggleModule, MatDatepickerModule,
    MatDivider, MatChipsModule,
    MatPaginatorModule, RouterOutlet,
    MatExpansionModule, MatSnackBarModule],
  templateUrl: './project.html',
  styleUrl: './project.css',
})
export class Project {
  private readonly route = inject(ActivatedRoute);
  private readonly projectStore = inject(ProjectStore);
  private readonly userStore = inject(UserStore);
  private readonly oauth2Service = inject(OAuth2Service);

  readonly projectCache = this.projectStore.selectedProjectCache;
  readonly currentUser = this.userStore.userCache;
 
  readonly isEditingName = signal(false);
  readonly isEditingDescription = signal(false);
  readonly isEditingDates = signal(false);
  readonly isSavingPrivacy = signal(true);
  
  readonly isUserConnectedToDropbox = this.oauth2Service.isDropboxConnected;
  readonly isUserConnectedToCalendar = this.oauth2Service.isCalendarConnected;

  readonly isCreator = this.projectStore.isCreator;
  readonly isAdmin = this.projectStore.isAdmin;
  readonly isContributor = this.projectStore.isContributor;

  readonly isManager = this.userStore.isManager;

  readonly creator = computed(() => this.projectCache().item?.projectRoles.find(pr => pr.roleType === 'CREATOR') ?? null);
  readonly admins = computed(() => this.projectCache().item?.projectRoles.filter(pr => pr.roleType === 'ADMIN') ?? []);
  readonly contributors = computed(() => this.projectCache().item?.projectRoles.filter(pr => pr.roleType === 'CONTRIBUTOR') ?? []);

  readonly projectId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('projectId')))), { initialValue: 0 }
  );

  readonly nameEditForm = new FormGroup({
    projectName: new FormControl('', { nonNullable: true, validators: [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50)
    ] })
  });

  readonly descriptionEditForm = new FormGroup({
    projectDescription: new FormControl('', { validators: [
      Validators.maxLength(500)
    ] })
  });

  readonly datesEditForm = new FormGroup({
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null)
  })

  readonly isPrivateCtrl = new FormControl<boolean>(false, { nonNullable: true });

  constructor(private readonly dialog: MatDialog,
              private readonly snackBar: MatSnackBar,
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

  onProjectNameEdit() {
    this.isEditingName.set(true);

    this.isEditingDescription.set(false);
    this.isEditingDates.set(false);
  }

  onSubmitProjectName() {
    const project = this.projectCache()?.item;

    if (project && this.nameEditForm.value.projectName && this.nameEditForm.value.projectName !== project.name) {
      const request = this.makeProjectUpdateRequest();

      if (request) {
        request.name = this.nameEditForm.value.projectName;
        this.projectStore.updateCachedProject(request).subscribe();
      }
    }
    this.isEditingName.set(false);
  }

  onCloseEditing() {
    this.isEditingDescription.set(false);
    this.isEditingName.set(false);
    this.isEditingDates.set(false);
  }

  onProjectDescriptionEdit() {
    this.isEditingDescription.set(true);

    this.isEditingName.set(false);
    this.isEditingDates.set(false);
  }

  onSubmitProjectDescription() {
    const project = this.projectCache()?.item;

    if (project && this.descriptionEditForm.value.projectDescription !== project.description) {
      const request = this.makeProjectUpdateRequest();

      if (request) {
        request.description = this.descriptionEditForm.value.projectDescription ?? undefined;
        this.projectStore.updateCachedProject(request).subscribe();
      }
    }
    this.isEditingDescription.set(false);
  }

  onIsPrivateToggleChange(isOn: boolean) {
    this.isSavingPrivacy.set(true);
    this.isPrivateCtrl.setValue(!isOn, { emitEvent: false });
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Change project visibility?',
        message: isOn ? 'Are you sure you want to make this project <strong>private</strong>?'
          : 'Are you sure you want to make this project <strong>public</strong>?'
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
    })).subscribe();
  }

  onProjectDatesEdit() {
    this.isEditingDates.set(true);

    this.isEditingDescription.set(false);
    this.isEditingName.set(false);
  }

  onSubmitProjectDates() {
    const project = this.projectCache()?.item;

    if (project) {
      const request = this.makeProjectUpdateRequest();

      if (request) {
        if (this.datesEditForm.value.startDate) {
          request.startDate = toLocalDateString(this.datesEditForm.value.startDate) ?? '';
        }
        request.endDate = toLocalDateString(this.datesEditForm.value.endDate ?? null);
        this.projectStore.updateCachedProject(request).subscribe();
      }
    }
    this.isEditingDates.set(false);
  }

  onAddUser() {
    this.dialog.open(AddUserDialog, {
      disableClose: true,
      width: '420px'
    })
    .afterClosed()
    .subscribe(confirmed => {
      if (confirmed) {
        console.log('User added successfuly.')
      }
    });
  }

  onRemoveUser(projectRole: ProjectRoleResponse) {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: `Remove user <strong>${projectRole.username}</strong>?`,
          message: `Are you sure you want to remove <strong>${projectRole.username}</strong> from the project?`
        }
      })
      .afterClosed().pipe(
        switchMap(confirmed => {
          if (confirmed) return this.projectStore.removeUserFromProject(projectRole.userId);
          return EMPTY;
        }),
        switchMap(response => this.projectStore.cacheSelectedProject(project.id, true).pipe(map(() => response)))
      ).subscribe({
        next: response => {
          let message = `${projectRole.username} has been removed from this project. `;
          if (response.dropboxDisconnected.status === 'FAILED') {
            message += 'Dropbox was not disconnected properly. ';
          }
          if (response.calendarDisconnected.status === 'FAILED') {
            message += 'Calendar was not disconnected properly.';
          }
          this.snackBar.open(message, 'Dismiss', {
            duration: 5000
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          if (error) {
            this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
              duration: 5000
            });
          }
        }
      });
    }
  }

  onQuitProject() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Quit project',
          message: 'Are you sure you want to <strong>quit</strong> this project?'
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.quitProject();
        return EMPTY;
      })).subscribe({
        next: () => {
          this.router.navigateByUrl('/dashboard');
          this.snackBar.open(`You have successfuly left project ${project.name}`, 'Dismiss', {
            duration: 3000
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onMakeAdmin(projectRole: ProjectRoleResponse) {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Make admin',
          message: `Are you sure you want to make <strong>${projectRole.username}</strong> an admin in this project?`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.changeMemberRole(projectRole.userId, { newRole: 'ADMIN'});
        return EMPTY;
      })).subscribe({
        next: () => {
          this.snackBar.open(`${projectRole.username} is now an admin`, 'Dismiss', {
            duration: 3000
          })
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onRemoveAdmin(projectRole: ProjectRoleResponse) {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Remove admin',
          message: `Are you sure you want to reduce privileges for <strong>${projectRole.username}</strong> in this project?`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.changeMemberRole(projectRole.userId, { newRole: 'CONTRIBUTOR'});
        return EMPTY;
      })).subscribe({
        next: () => {
          this.snackBar.open(`${projectRole.username} is now a contributor`, 'Dismiss', {
            duration: 3000
          })
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onTransferOwnership(projectRole: ProjectRoleResponse) {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Trasfer ownership',
          message: `Are you sure you want to transfer ownership of this project to <strong>${projectRole.username}</strong>?`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.changeMemberRole(projectRole.userId, { newRole: 'CREATOR'});
        return EMPTY;
      })).subscribe({
        next: () => {
          this.snackBar.open(`${projectRole.username} is now the creator. You are now an admin.`, 'Dismiss', {
            duration: 3000
          })
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onDeleteProject() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Delete project',
          message: `Are you sure you want to <strong>delete</strong> this project? This operation is irreversible.`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.deleteProject();
        return EMPTY;
      })).subscribe({
        next: () => {
          this.router.navigateByUrl('/dashboard');
          this.snackBar.open(`You have successfuly deleted ${project.name}`, 'Dismiss', {
            duration: 3000
          })
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onConnectDropbox() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Connect Dropbox',
          message: `Are you sure you want to <strong>connect</strong> Dropbox to this project? It might take a <strong>significant</strong> amount of time and can't be reversed.`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.connectProjectToDropbox();
        return EMPTY;
      })).subscribe({
        next: () => {
          this.snackBar.open('Dropbox has been successfully connected to this project.', 'Dismiss', {
            duration: 3000
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onConnectCalendar() {
    const project = this.projectCache()?.item;

    if (project) {      
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Connect Calendar',
          message: `Are you sure you want to <strong>connect</strong> Calendar to this project? It might take a <strong>significant</strong> amount of time and can't be reversed.`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.projectStore.connectProjectToCalendar();
        return EMPTY;
      })).subscribe({
        next: () => {
          this.snackBar.open('Calendar has been successfully connected to this project.', 'Dismiss', {
            duration: 3000
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });     
    }
  }

  onJoinDropbox() {
    const project = this.projectCache()?.item;

    if (project) {         
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Join Dropbox',
          message: `Are you sure you want to <strong>join</strong> Dropbox in this project? It might take a <strong>significant</strong> amount of time and can't be reversed.`
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
      ).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      }); 
    }
  }

  onJoinCalendar() {
    const project = this.projectCache()?.item;

    if (project) {         
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Join Calendar',
          message: `Are you sure you want to <strong>join</strong> Calendar in this project? It might take a <strong>significant</strong> amount of time and can't be reversed.`
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
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });   
    }
  }

  onDisconnectDropbox() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Disconnect Dropbox',
          message: `Are you sure you want to <strong>disconnect</strong> Dropbox from this project? This will delete <strong>all attachments</strong> in the project.`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(
        switchMap(confirmed => {
          if (confirmed) return this.projectService.disconnectDropbox(project.id);
          return EMPTY;
        }),
        switchMap(response => this.projectStore.cacheSelectedProject(project.id, true).pipe(map(() => response)))
      ).subscribe({
        next: result => {
          if (result.isDropboxFolderDeleted !== undefined) this.snackBar.open(
            result.isDropboxFolderDeleted ? 'Dropbox has been disconnected successfully.'
            : 'Dropbox has been disconnected from this project, but the shared folder on Dropbox has '
            + 'not been deleted due to an error. You might have to delete it manually.', 'Dismiss', {
              duration: 7000
            });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onDisconnectCalendar() {
    const project = this.projectCache()?.item;

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Disconnect Calendar',
          message: `Are you sure you want to <strong>disconnect</strong> Calendar from this project? This will delete the calendar and all its events.`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(
        switchMap(confirmed => {
          if (confirmed) return this.projectService.disconnectCalendar(project.id);
          return EMPTY;
        }),
        switchMap(response => this.projectStore.cacheSelectedProject(project.id, true).pipe(map(() => response)))
      ).subscribe({
        next: result => {
          if (result.isCalendarDeleted !== undefined) this.snackBar.open(
            result.isCalendarDeleted ? 'Calendar has been disconnected successfully.'
            : 'Calendar has been disconnected from this project, but the actual Google Calendar has '
            + 'not been deleted due to an error. You might have to delete it manually.', 'Dismiss', {
              duration: 7000
            });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onChangeStatus(status: 'IN_PROGRESS' | 'COMPLETED') {
    this.projectStore.changeStatus(status).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  onReload() {
    this.projectStore.cacheSelectedProject(this.projectId(), true).subscribe();
  }

  getChipColorLocal(value: string | null): string {
    return getChipColor(value);
  }

  getChipTextLocal(value: string | null): string {
    return getChipText(value);
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
