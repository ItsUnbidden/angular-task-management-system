import { Component, computed, effect, inject, Inject, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { LabelService } from '../../../service/label.service';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from "@angular/material/form-field";
import { HttpErrorResponse } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIcon } from "@angular/material/icon";
import { switchMap, tap } from 'rxjs';
import { LabelStore } from '../../../cache/label.store';
import { getDefaultErrorMessageForType } from '../../../utils';
import { ValidationBoundaries } from '../../validation-boundaries';
import { LabelColor, LabelResponse } from '../../../models/label.model';
import { SimpleApiError } from '../../../models/error.model';
import { NotificationService } from '../../../service/notification.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

interface LabelManagementDialogData {
  projectId: number;
  taskId: number;
}

@Component({
  selector: 'app-label-management-dialog',
  imports: [MatTableModule, MatChipsModule, MatButtonModule,
            MatFormFieldModule, MatDialogModule, MatProgressSpinnerModule,
            ReactiveFormsModule, MatInputModule, MatIcon, TranslatePipe],
  templateUrl: './label-management-dialog.html',
  styleUrl: './label-management-dialog.css'
})
export class LabelManagementDialog {
  protected readonly NAME_MAX_LENGTH = ValidationBoundaries.LABEL_NAME_MAX_LENGTH;
  protected readonly palette = Object.values(LabelColor);

  private readonly labelStore = inject(LabelStore);

  protected readonly displayedColumns = ['chip', 'edit', 'delete'];

  protected readonly labelCache = this.labelStore.cache.asReadonly();
  protected readonly selectedLabel = signal<LabelResponse | null>(null);

  protected readonly isEditing = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly isEditRequestRunning = signal<boolean>(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly numberOfAffectedTasks = computed(() => { 
    const label = this.selectedLabel();

    return (label) ? label.taskIds.filter(tId => tId !== this.data.taskId).length : 0;
  })

  protected readonly labelForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [
      Validators.required,
      Validators.maxLength(ValidationBoundaries.LABEL_NAME_MAX_LENGTH)
    ]}),
    color: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]})
  })

  private hasChangedLabels = false;

  constructor(private readonly dialogRef: MatDialogRef<LabelManagementDialog, boolean>,
              private readonly notification: NotificationService,
              private readonly labelService: LabelService,
              @Inject(MAT_DIALOG_DATA) public readonly data: LabelManagementDialogData) {
    effect(() => {
      const label = this.selectedLabel();

      if (label) {
        this.labelForm.patchValue({
          name: label.name,
          color: label.color
        }, {
          emitEvent: false
        })
      }
    })
  }

  protected onEditLabel(label: LabelResponse) {
    this.selectedLabel.set(label);
    this.isEditing.set(true);
  }

  protected onRemoveLabel(label: LabelResponse) {
    this.selectedLabel.set(label);
    this.isDeleting.set(true);
  }

  protected onExecuteDeleteLabel() {
    const label = this.selectedLabel();

    if (label) {
      this.isEditRequestRunning.set(true);
      this.labelService.deleteLabel(label.id).pipe(
        tap({
          next: () => {
            this.hasChangedLabels = true;
            this.notification.info('label.success.delete', 5000, { name: label.name });
            this.isEditRequestRunning.set(false);
            this.onBack();
          }
        }),
        switchMap(() => this.labelStore.cacheLabelsForProject(this.data.projectId, true))
      ).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as SimpleApiError;

          this.isEditRequestRunning.set(false);
          this.editError.set(getDefaultErrorMessageForType(error));
        }
      });
    }
  }
  
  protected onExecuteEditLabel() {
    const label = this.selectedLabel();

    if (label) {
      this.isEditRequestRunning.set(true);
      this.labelService.updateLabel(label.id, {
        name: this.labelForm.value.name ?? '',
        color: this.labelForm.value.color ?? '',
        taskIds: label.taskIds
      }).subscribe({
        next: label => {
          this.hasChangedLabels = true;
          this.notification.info('label.success.edit', 5000, { name: label.name });
          this.isEditRequestRunning.set(false);
          this.labelStore.replace(label);
          this.onBack();
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as SimpleApiError;

          this.isEditRequestRunning.set(false);
          this.editError.set(getDefaultErrorMessageForType(error));
        }
      });
    }
  }

  protected onBack() {
    this.isDeleting.set(false);
    this.isEditing.set(false);
  }

  protected onClose() {
    this.dialogRef.close(this.hasChangedLabels);
  }
}
