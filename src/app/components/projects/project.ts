import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ProjectService } from '../../service/project.service';
import { GeneralApiError, ProjectResponse, ProjectRoleResponse, ProjectUpdateRequest } from '../../models';
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
import { map } from 'rxjs';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatExpansionModule } from '@angular/material/expansion';
import { AddUserDialog } from '../users/add-user-dialog/add-user-dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../service/user.service';

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
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private userService = inject(UserService);

  project = this.projectService.project;
  currentUser = this.userService.user;
  isProjectLoading = this.projectService.isLoading;
 
  isEditingName = signal(false);
  isEditingDescription = signal(false);
  isEditingDates = signal(false);
  isSavingPrivacy = signal(true);
  
  // Not implemented at the moment
  isDropboxAuthorized = signal(false);
  isGoogleCalendarAuthorized = signal(false);

  isCreator = this.projectService.isCreator;
  isAdmin = this.projectService.isAdmin;
  isContributor = this.projectService.isContributor;

  creator = computed(() => this.project()?.projectRoles.find(pr => pr.roleType === 'CREATOR') ?? null);
  admins = computed(() => this.project()?.projectRoles.filter(pr => pr.roleType === 'ADMIN') ?? []);
  contributors = computed(() => this.project()?.projectRoles.filter(pr => pr.roleType === 'CONTRIBUTOR') ?? []);

  projectId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('projectId')))), { initialValue: 0 }
  );

  nameEditForm = new FormGroup({
    projectName: new FormControl('', { nonNullable: true, validators: [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50)
    ] })
  });

  descriptionEditForm = new FormGroup({
    projectDescription: new FormControl('', { validators: [
      Validators.maxLength(500)
    ] })
  });

  datesEditForm = new FormGroup({
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null)
  })

  isPrivateCtrl = new FormControl<boolean>(false, { nonNullable: true });

  constructor(private dialog: MatDialog, private snackBar: MatSnackBar, private router: Router) {
    effect(() => {
      const id = this.projectId();

      if (id) {
        this.handleLoadProjectToCache(id);
      }      
    })

    effect(() => {
      const project = this.project();

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
            })
          }       
        })
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
      })
    })
  } 

  onProjectNameEdit() {
    this.isEditingName.set(true);

    this.isEditingDescription.set(false);
    this.isEditingDates.set(false);
  }

  onSubmitProjectName() {
    const project = this.project();

    if (project && this.nameEditForm.value.projectName && this.nameEditForm.value.projectName !== project.name) {
      const request = this.makeProjectUpdateRequest();

      if (request) {
        request.name = this.nameEditForm.value.projectName;
        this.handleUpdateCachedProject(project.id, request);
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
    const project = this.project();

    if (project && this.descriptionEditForm.value.projectDescription !== project.description) {
      const request = this.makeProjectUpdateRequest();

      if (request) {
        request.description = this.descriptionEditForm.value.projectDescription ?? undefined;
        this.handleUpdateCachedProject(project.id, request);
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
        message: isOn ? 'Are you sure you want to make this project private?' : 'Are you sure you want to make this project public?'
      },
      disableClose: true,
      width: '420px'
    })
    .afterClosed()
    .subscribe(confirmed => {
      if (confirmed) {
        const project = this.project();

        if (project) {
          const request = this.makeProjectUpdateRequest();

          if (request) {
            request.isPrivate = isOn;
            this.projectService.updateCachedProject(project.id, request);
          }
        }
      } else {
        this.isSavingPrivacy.set(false);
      }
    })
  }

  onProjectDatesEdit() {
    this.isEditingDates.set(true);

    this.isEditingDescription.set(false);
    this.isEditingName.set(false);
  }

  onSubmitProjectDates() {
    const project = this.project();

    if (project) {
      const request = this.makeProjectUpdateRequest();

      if (request) {
        if (this.datesEditForm.value.startDate) {
          request.startDate = this.toLocalDateString(this.datesEditForm.value.startDate) ?? '';
        }
        request.endDate = this.toLocalDateString(this.datesEditForm.value.endDate ?? null);
        this.handleUpdateCachedProject(project.id, request);
      }
    }
    this.isEditingDates.set(false);
  }

  onAddUser() {
    this.dialog.open(AddUserDialog, {
      data: this.projectId(),
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
    const project = this.project();

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: `Remove user ${projectRole.username}?`,
          message: `Are you sure you want to remove ${projectRole.username} from the project?`
        }
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.projectService.removeUserFromProject(project.id, projectRole.userId).subscribe({
            next: () => {
              this.handleLoadProjectToCache(project.id);
            },
            error: (err: HttpErrorResponse) => {
              const error = err.error as GeneralApiError;

              if (error) {
                this.snackBar.open(`Error: ${error.error}`, 'Dismiss', {
                  duration: 5000
                })
              }
            }
          });
        }
      })
    }
  }

  onQuitProject() {
    const project = this.project();

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Quit project',
          message: 'Are you sure you want to quit this project?'
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.projectService.quitProject(project.id).subscribe({
            next: () => {
              this.router.navigateByUrl('/dashboard');
              this.snackBar.open(`You have successfuly left ${project.name}`, 'Dismiss', {
                duration: 3000
              })
            },
            error: (err: HttpErrorResponse) => {
              const errorMessage = err.error.error;

              this.snackBar.open(errorMessage ? `Error: ${errorMessage}` : 'Unknown error.', 'Dismiss', {
                duration: 5000
              })
            }
          });
        }
      })
    }
  }

  onMakeAdmin(projectRole: ProjectRoleResponse) {
    const project = this.project();

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Make admin',
          message: `Are you sure you want to make ${projectRole.username} an admin in this project?`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.projectService.changeMemberRole(project.id, projectRole.userId, { newRole: 'ADMIN'}).subscribe({
            next: () => {
              this.snackBar.open(`${projectRole.username} is now an admin`, 'Dismiss', {
                duration: 3000
              })
            },
            error: (err: HttpErrorResponse) => {
              const errorMessage = err.error.error;

              this.snackBar.open(errorMessage ? `Error: ${errorMessage}` : 'Unknown error.', 'Dismiss', {
                duration: 5000
              })
            }
          });
        }
      })
    }
  }

  onRemoveAdmin(projectRole: ProjectRoleResponse) {
    const project = this.project();

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Remove admin',
          message: `Are you sure you want to reduce privileges for ${projectRole.username} in this project?`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.projectService.changeMemberRole(project.id, projectRole.userId, { newRole: 'CONTRIBUTOR'}).subscribe({
            next: () => {
              this.snackBar.open(`${projectRole.username} is now a contributor`, 'Dismiss', {
                duration: 3000
              })
            },
            error: (err: HttpErrorResponse) => {
              const errorMessage = err.error.error;

              this.snackBar.open(errorMessage ? `Error: ${errorMessage}` : 'Unknown error.', 'Dismiss', {
                duration: 5000
              })
            }
          });
        }
      })
    }
  }

  onTransferOwnership(projectRole: ProjectRoleResponse) {
    const project = this.project();

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Trasfer ownership',
          message: `Are you sure you want to transfer ownership of this project to ${projectRole.username}?`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.projectService.changeMemberRole(project.id, projectRole.userId, { newRole: 'CREATOR'}).subscribe({
            next: () => {
              this.snackBar.open(`${projectRole.username} is now the creator. You are now an admin.`, 'Dismiss', {
                duration: 3000
              })
            },
            error: (err: HttpErrorResponse) => {
              const errorMessage = err.error.error;

              this.snackBar.open(errorMessage ? `Error: ${errorMessage}` : 'Unknown error.', 'Dismiss', {
                duration: 5000
              })
            }
          });
        }
      })
    }
  }

  onDeleteProject() {
    const project = this.project();

    if (project) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Delete project',
          message: `Are you sure you want to delete this project? This operation is irreversible.`
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.projectService.deleteProject(project.id).subscribe({
            next: () => {
              this.router.navigateByUrl('/dashboard');
              this.snackBar.open(`You have successfuly deleted ${project.name}`, 'Dismiss', {
                duration: 3000
              })
            },
            error: (err: HttpErrorResponse) => {
              const errorMessage = err.error.error;

              this.snackBar.open(errorMessage ? `Error: ${errorMessage}` : 'Unknown error.', 'Dismiss', {
                duration: 5000
              })
            }
          });
        }
      })
    }
  }

  onConnectDropbox() {
    this.snackBar.open(`Not implemented.`, 'Dismiss', {
      duration: 3000
    })
  }

  onConnectCalendar() {
    this.snackBar.open(`Not implemented.`, 'Dismiss', {
      duration: 3000
    })
  }

  statusColor(status: string | null): string {
    switch (status) {
      case 'INITIATED': return 'status-initiated';
      case 'NOT_STARTED': return 'status-initiated';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'COMPLETED': return 'status-completed';
      case 'OVERDUE': return 'status-overdue';
      default: return '';
    }
  }

  statusText(status: string | null): string {
    switch (status) {
      case 'INITIATED': return 'Initiated';
      case 'NOT_STARTED': return 'Not started';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'OVERDUE': return 'Overdue';
      default: return '';
    }
  }

  private makeProjectUpdateRequest() : ProjectUpdateRequest | undefined {
    const project = this.project();

    if (!project) return undefined;
    
    return { name: project.name,
            description: project.description,
            startDate: project.startDate ?? '',
            endDate: project.endDate,
            isPrivate: project.isPrivate };
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

  private handleLoadProjectToCache(projectId: number) {
    this.projectService.loadProjectToCache(projectId).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        if (error) {
          if (err.status === 403) {
            this.router.navigateByUrl('/forbidden');
          } else {
            this.snackBar.open('Unknown error occured. Please try again.', 'Dismiss');
          }
        }
      }
    });
  }

  private handleUpdateCachedProject(projectId: number, request: ProjectUpdateRequest) {
    this.projectService.updateCachedProject(projectId, request).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        if (error) {
          this.snackBar.open('You do not have the authority to access this resource.', 'Dismiss', {
            duration: 5000
          });
        }
      }
    });
  }
}
