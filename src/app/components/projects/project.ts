import { Component, effect, inject, signal, untracked } from '@angular/core';
import { ProjectService } from '../../service/project.service';
import { ProjectResponse, ProjectUpdateRequest } from '../../models';
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
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TaskService } from '../../service/task.service';


@Component({
  selector: 'app-overview',
  imports: [CommonModule, MatCardModule,
    MatProgressSpinnerModule, MatIconModule,
    MatInputModule, MatFormFieldModule,
    ReactiveFormsModule, MatButtonModule,
    MatSlideToggleModule, MatDatepickerModule,
    MatDivider, MatChipsModule,
    MatPaginatorModule, RouterOutlet],
  templateUrl: './project.html',
  styleUrl: './project.css',
})
export class Project {
  private route = inject(ActivatedRoute);

  project = signal<ProjectResponse | null>(null);
  isProjectLoading = signal(false);
 
  isEditingName = signal(false);
  isEditingDescription = signal(false);
  isEditingDates = signal(false);
  isSavingPrivacy = signal(true);

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

  constructor(private projectService: ProjectService, private taskService: TaskService, private dialog: MatDialog) {
    this.project = projectService.project;
    this.isProjectLoading = projectService.isLoading;
    
    effect(() => {
      const id = this.projectId();

      if (id) {
        projectService.loadProjectToCache(id);
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
        this.projectService.updateCachedProject(project.id, request);
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
        this.projectService.updateCachedProject(project.id, request);
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
        message: isOn ? 'Are you sure you want to make this project private?' : 'Are you sure you want to make this project public?',
        submitButton: 'Yes',
        cancelButton: 'No'
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
        this.projectService.updateCachedProject(project.id, request);
      }
    }
    this.isEditingDates.set(false);
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
}
