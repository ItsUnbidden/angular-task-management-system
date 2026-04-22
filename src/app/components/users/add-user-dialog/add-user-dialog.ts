import { Component, Inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ProjectService } from '../../../service/project.service';
import { GeneralApiError } from '../../../models';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-add-user-dialog',
  imports: [MatDialogModule, MatFormFieldModule, ReactiveFormsModule,
            MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './add-user-dialog.html',
  styleUrl: './add-user-dialog.css',
})
export class AddUserDialog {
  readonly error = signal('');
  readonly isSendingRequest = signal(false);

  addUserForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(25)
      ]
    })
  })

  constructor(private dialogRef: MatDialogRef<AddUserDialog, boolean>, private projectService: ProjectService, @Inject(MAT_DIALOG_DATA) private data: number) {}

  submit() {
    if (this.addUserForm.valid) {
      const username = this.addUserForm.value.username;

      if (username) {
        this.isSendingRequest.set(true);
        this.projectService.addUserToProject(this.data, username).subscribe({
          next: () => {
            this.dialogRef.close(true);
            this.isSendingRequest.set(false);
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

  close() {
    this.dialogRef.close();
  }
}
