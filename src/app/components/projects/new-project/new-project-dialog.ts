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
  readonly error = signal('');
  readonly isSendingRequest = signal(false);

  readonly projectForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50)
    ]),
    description: new FormControl('', [
      Validators.maxLength(500)
    ]),
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
    isPrivate: new FormControl(false)
  });

  constructor(private readonly dialogRef: MatDialogRef<NewProjectDialog, boolean>,
              private readonly projectService: ProjectService) {}

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
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
