import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectStore } from '../../../cache/project.store';
import { HttpErrorResponse } from '@angular/common/http';
import { getDefaultErrorMessageForType } from '../../../utils';
import { ValidationBoundaries } from '../../validation-boundaries';
import { SimpleApiError } from '../../../models/error.model';
import { ProjectWithDropboxResultResponse } from '../../../models/project.model';

@Component({
  selector: 'app-add-user-dialog',
  imports: [MatDialogModule, MatFormFieldModule, ReactiveFormsModule,
            MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './add-user-dialog.html',
  styleUrl: './add-user-dialog.css',
})
export class AddUserDialog {
  protected readonly USERNAME_MAX_LENGTH = ValidationBoundaries.USER_USERNAME_MAX_LENGTH;
  protected readonly USERNAME_MIN_LENGTH = ValidationBoundaries.USER_USERNAME_MIN_LENGTH;

  private readonly projectStore = inject(ProjectStore);

  protected readonly selectedProjectCache = this.projectStore.selectedProjectCache.asReadonly();

  protected readonly addUserForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(ValidationBoundaries.USER_USERNAME_MIN_LENGTH),
        Validators.maxLength(ValidationBoundaries.USER_USERNAME_MAX_LENGTH)
      ]
    })
  })

  constructor(private readonly dialogRef: MatDialogRef<AddUserDialog, ProjectWithDropboxResultResponse>) {}

  protected submit() {
    if (this.addUserForm.valid) {
      const username = this.addUserForm.value.username;

      if (username) {
        this.projectStore.addUserToProject(username).subscribe({
          next: (response) => {
            this.dialogRef.close(response);
          }
        });
      }
    }
  }

  protected close() {
    this.dialogRef.close();
  }
}
