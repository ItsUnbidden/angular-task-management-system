import { Component, computed, effect, inject, Inject, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { LabelResponse, SimpleApiError } from '../../../models';
import { LabelService } from '../../../service/label.service';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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

interface LabelManagementDialogData {
  projectId: number;
  taskId: number;
}

@Component({
  selector: 'app-label-management-dialog',
  imports: [MatTableModule, MatChipsModule, MatButtonModule, MatFormFieldModule, MatDialogModule, MatProgressSpinnerModule, ReactiveFormsModule, MatInputModule, MatIcon],
  templateUrl: './label-management-dialog.html',
  styleUrl: './label-management-dialog.css',
  providers: [
    LabelStore
  ]
})
export class LabelManagementDialog {
  private readonly labelStore = inject(LabelStore);

  readonly displayedColumns = ['chip', 'edit', 'delete'];

  readonly labelCache = this.labelStore.cache;
  readonly selectedLabel = signal<LabelResponse | null>(null);

  readonly isEditing = signal(false);
  readonly isDeleting = signal(false);
  readonly isEditRequestRunning = signal<boolean>(false);
  readonly editError = signal<string | null>(null);

  readonly numberOfAffectedTasks = computed(() => { 
    const label = this.selectedLabel();

    return (label) ? label.taskIds.filter(tId => tId !== this.data.taskId).length : 0;
  })

  readonly paletteItems = ['blue', 'green', 'red', 'yellow'];

  readonly labelForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]}),
    color: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]})
  })

  private hasChangedLabels = false;

  constructor(private readonly dialogRef: MatDialogRef<LabelManagementDialog, boolean>,
              private readonly snackBar: MatSnackBar,
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

  ngOnInit() {
    this.labelStore.cacheLabelsForProject(this.data.projectId).subscribe();
  }

  onEditLabel(label: LabelResponse) {
    this.selectedLabel.set(label);
    this.isEditing.set(true);
  }

  onRemoveLabel(label: LabelResponse) {
    this.selectedLabel.set(label);
    this.isDeleting.set(true);
  }

  onExecuteDeleteLabel() {
    const label = this.selectedLabel();

    if (label) {
      this.isEditRequestRunning.set(true);
      this.labelService.deleteLabel(label.id).pipe(
        tap({
          next: () => {
            this.hasChangedLabels = true;
            this.snackBar.open(`Label ${label.name} has been deleted.`, 'Dismiss', {
              duration: 3000
            });
            this.isEditRequestRunning.set(false);
            this.onBack();
          }
        }),
        switchMap(() => this.labelStore.cacheLabelsForProject(this.data.projectId))
      ).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as SimpleApiError;

          this.isEditRequestRunning.set(false);
          this.editError.set(getDefaultErrorMessageForType(error));
        }
      });
    }
  }
  
  onExecuteEditLabel() {
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
          this.snackBar.open(`Label ${label.name} has been changed.`, 'Dismiss', {
            duration: 3000
          });
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

  onBack() {
    this.isDeleting.set(false);
    this.isEditing.set(false);
  }

  onClose() {
    this.dialogRef.close(this.hasChangedLabels);
  }
}
