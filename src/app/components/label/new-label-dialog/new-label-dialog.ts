import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LabelService } from '../../../service/label.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from "@angular/material/chips";
import { MatInputModule } from '@angular/material/input';
import { getDefaultErrorMessageForType } from '../../../utils';
import { finalize } from 'rxjs';
import { ValidationBoundaries } from '../../validation-boundaries';
import { LabelColor, LabelCreateRequest } from '../../../models/label.model';
import { GeneralApiError } from '../../../models/error.model';
import { TranslatePipe } from '@ngx-translate/core';

interface NewLabelData {
  projectId: number,
  taskId?: number
}

@Component({
  selector: 'app-new-label-dialog',
  imports: [MatFormFieldModule, MatButtonModule, MatDialogModule,
            ReactiveFormsModule, MatProgressSpinnerModule, MatChipsModule,
            MatInputModule, TranslatePipe],
  templateUrl: './new-label-dialog.html',
  styleUrl: './new-label-dialog.css',
})
export class NewLabelDialog {
  protected readonly NAME_MAX_LENGTH = ValidationBoundaries.LABEL_NAME_MAX_LENGTH;
  protected readonly palette = Object.values(LabelColor);

  protected readonly error = signal('');
  protected readonly isSendingRequest = signal(false);

  protected readonly labelForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [
      Validators.required,
      Validators.maxLength(ValidationBoundaries.LABEL_NAME_MAX_LENGTH)
    ]}),
    color: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]})
  })

  constructor(private readonly dialogRef: MatDialogRef<NewLabelDialog, boolean>,
    private readonly labelService: LabelService,
    @Inject(MAT_DIALOG_DATA) private readonly data: NewLabelData) {}
  
  protected close(): void {
      this.dialogRef.close();
    }
  
  protected submit(): void {
    if (this.labelForm.valid) {
      const request: LabelCreateRequest = {
        name: this.labelForm.value.name ?? '',
        color: this.labelForm.value.color ?? '',
        projectId: this.data.projectId,
        taskIds: this.data.taskId ? [ this.data.taskId ] : []
      };
      this.isSendingRequest.set(true);
      this.labelService.createLabel(request).pipe(
        finalize(() => this.isSendingRequest.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;
          
          this.error.set(getDefaultErrorMessageForType(error));
        }
      });
    }
  }
}
