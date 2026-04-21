import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LabelService } from '../../../service/label.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GeneralApiError, LabelCreateRequest } from '../../../models';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from "@angular/material/chips";
import { MatInputModule } from '@angular/material/input';

interface NewLabelData {
  projectId: number,
  taskId: number
}

@Component({
  selector: 'app-new-label-dialog',
  imports: [MatFormFieldModule, MatButtonModule, MatDialogModule, ReactiveFormsModule, MatProgressSpinnerModule, MatChipsModule, MatInputModule],
  templateUrl: './new-label-dialog.html',
  styleUrl: './new-label-dialog.css',
})
export class NewLabelDialog {
  error = signal('');
  isSendingRequest = signal(false);

  paletteItems = ['blue', 'green', 'red', 'yellow'];

  labelForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]}),
    color: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]})
  })

  constructor(private dialogRef: MatDialogRef<NewLabelDialog, boolean>, private labelService: LabelService, @Inject(MAT_DIALOG_DATA) private data: NewLabelData) {}
  
  close(): void {
      this.dialogRef.close();
    }
  
  submit(): void {
    if (this.labelForm.valid) {
      const request: LabelCreateRequest = {
        name: this.labelForm.value.name ?? '',
        color: this.labelForm.value.color ?? '',
        projectId: this.data.projectId,
        taskIds: [ this.data.taskId ]
      };
      this.isSendingRequest.set(true);
      this.labelService.createLabel(request).subscribe({
        next: () => {
          this.isSendingRequest.set(false);
          this.dialogRef.close(true);
        },
        error: (err: HttpErrorResponse) => {
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
