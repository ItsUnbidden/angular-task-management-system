import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatButtonModule } from "@angular/material/button";
import { GeneralApiError, ProjectCreateRequest } from '../../../models';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { ProjectService } from '../../../service/project.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { getDefaultErrorMessageForType, toLocalDateString } from '../../../utils';
import { finalize } from 'rxjs';
import { ValidationBoundaries } from '../../validation-boundaries';

@Component({
  selector: 'app-new-project-dialog',
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule,
            ReactiveFormsModule, MatNativeDateModule, MatDatepickerModule,
            MatButtonModule, MatCheckboxModule, MatIconModule,
            MatProgressSpinnerModule],
  templateUrl: './new-project-dialog.html',
  styleUrl: './new-project-dialog.css',
})
export class NewProjectDialog {
  protected readonly NAME_MAX_LENGTH = ValidationBoundaries.PROJECT_NAME_MAX_LENGTH;
  protected readonly NAME_MIN_LENGTH = ValidationBoundaries.PROJECT_NAME_MIN_LENGTH;
  protected readonly DESCRIPTION_MAX_LENGTH = ValidationBoundaries.PROJECT_DESCRIPTION_MAX_LENGTH;

  protected readonly error = signal('');
  protected readonly isSendingRequest = signal(false);

  protected readonly projectForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(ValidationBoundaries.PROJECT_NAME_MIN_LENGTH),
      Validators.maxLength(ValidationBoundaries.PROJECT_NAME_MAX_LENGTH)
    ]),
    description: new FormControl('', [
      Validators.maxLength(ValidationBoundaries.PROJECT_DESCRIPTION_MAX_LENGTH)
    ]),
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
    isPrivate: new FormControl(false)
  });

  constructor(private readonly dialogRef: MatDialogRef<NewProjectDialog, boolean>,
              private readonly projectService: ProjectService) {}

  protected close(): void {
    this.dialogRef.close();
  }

  protected submit(): void {
    if (this.projectForm.valid) {
      const request: ProjectCreateRequest = {
        name: this.projectForm.get('name')?.value || '',
        description: this.projectForm.get('description')?.value || undefined,
        startDate: toLocalDateString(this.projectForm.get('startDate')?.value ?? null),
        endDate: toLocalDateString(this.projectForm.get('endDate')?.value ?? null),
        isPrivate: this.projectForm.get('isPrivate')?.value || false,
      };
      this.isSendingRequest.set(true);
      this.projectService.createProject(request)
        .pipe(finalize(() => this.isSendingRequest.set(false)))
        .subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: (err) => {
            const error = err.error as GeneralApiError;
            
            this.error.set(getDefaultErrorMessageForType(error));
          }
        });
    }
  }
}
