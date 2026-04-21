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
import { toLocalDateString } from '../../../utils';

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

  projectControl = new FormGroup({
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

  constructor(private dialogRef: MatDialogRef<NewProjectDialog, boolean>, private projectService: ProjectService) {}

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.projectControl.valid) {
      const request: ProjectCreateRequest = {
        name: this.projectControl.get('name')?.value || '',
        description: this.projectControl.get('description')?.value || undefined,
        startDate: toLocalDateString(this.projectControl.get('startDate')?.value ?? null),
        endDate: toLocalDateString(this.projectControl.get('endDate')?.value ?? null),
        isPrivate: this.projectControl.get('isPrivate')?.value || false,
      };
      this.isSendingRequest.set(true);
      this.projectService.createProject(request).subscribe({
        next: () => {
          this.isSendingRequest.set(false);
          this.dialogRef.close(true);
        },
        error: (err) => {
          const error = err.error as GeneralApiError;
          
          if (error) {
            this.error.set(error.errors[0]);
          }
          else {
            this.error.set('Unknown error')
          }
          this.isSendingRequest.set(false);
        }
      });
    }
  }
}
