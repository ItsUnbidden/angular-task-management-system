import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectStore } from '../../../cache/project.store';
import { HttpErrorResponse } from '@angular/common/http';
import { SimpleApiError } from '../../../models';
import { getDefaultErrorMessageForType } from '../../../utils';

@Component({
  selector: 'app-add-user-dialog',
  imports: [MatDialogModule, MatFormFieldModule, ReactiveFormsModule,
            MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './add-user-dialog.html',
  styleUrl: './add-user-dialog.css',
})
export class AddUserDialog {
  private readonly projectStore = inject(ProjectStore);

  readonly selectedProjectCache = this.projectStore.selectedProjectCache.asReadonly();

  readonly error = signal<string | null>(null);

  readonly addUserForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(25)
      ]
    })
  })

  constructor(private readonly dialogRef: MatDialogRef<AddUserDialog, boolean>) {}

  submit() {
    if (this.addUserForm.valid) {
      const username = this.addUserForm.value.username;

      if (username) {
        this.error.set(null);
        this.projectStore.addUserToProject(username).subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: (err: HttpErrorResponse) => {
            const error = err.error as SimpleApiError;

            this.error.set(getDefaultErrorMessageForType(error));
          }
        });
      }
    }
  }

  close() {
    this.dialogRef.close();
  }
}
