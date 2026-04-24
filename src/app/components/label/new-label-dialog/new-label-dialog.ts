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
  readonly error = signal('');
  readonly isSendingRequest = signal(false);

  readonly paletteItems = ['blue', 'green', 'red', 'yellow'];

  readonly labelForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]}),
    color: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]})
  })

  constructor(private readonly dialogRef: MatDialogRef<NewLabelDialog, boolean>,
    private readonly labelService: LabelService,
    @Inject(MAT_DIALOG_DATA) private readonly data: NewLabelData) {}
  
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
          
          this.error.set(error ? error.errors[0] : 'Unknown error occured while attempting to create a new label.');

          this.isSendingRequest.set(false);
        }
      });
    }
  }
}
