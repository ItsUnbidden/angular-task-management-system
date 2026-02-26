import { Component, computed, effect, Inject, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { GeneralApiError, LabelResponse } from '../../../models';
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

interface LabelManagementDialogData {
  projectId: number;
  taskId: number;
}

@Component({
  selector: 'app-label-management-dialog',
  imports: [MatTableModule, MatChipsModule, MatButtonModule, MatFormFieldModule, MatDialogModule, MatProgressSpinnerModule, ReactiveFormsModule, MatInputModule, MatIcon],
  templateUrl: './label-management-dialog.html',
  styleUrl: './label-management-dialog.css',
})
export class LabelManagementDialog {
  displayedColumns = ['chip', 'edit', 'delete'];
  dataSource = new MatTableDataSource<LabelResponse>([]);
  selectedLabel = signal<LabelResponse | null>(null);
  error = signal('');
  isLoading = signal(false);
  isEditing = signal(false);
  isDeleting = signal(false);

  hasChangedLabels = false;
  numberOfAffectedTasks = computed(() => {
    const label = this.selectedLabel();

    return (label) ? label.taskIds.filter(tId => tId !== this.data.taskId).length : 0;
  })

  paletteItems = ['blue', 'green', 'red', 'yellow'];

  labelForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]}),
    color: new FormControl('', { nonNullable: true, validators: [
      Validators.required
    ]})
  })

  constructor(private dialogRef: MatDialogRef<LabelManagementDialog, boolean>, private snackBar: MatSnackBar,
              private labelService: LabelService, @Inject(MAT_DIALOG_DATA) public data: LabelManagementDialogData) {
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
    this.loadLabelsForProject(this.data.projectId);
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
      this.isLoading.set(true);
      this.labelService.deleteLabel(label.id).subscribe({
        next: () => {                        
          this.isLoading.set(false);
          this.hasChangedLabels = true;
          this.snackBar.open(`Label ${label.id} has been deleted.`, 'Dismiss', {
            duration: 3000
          })
          this.loadLabelsForProject(this.data.projectId);
          this.onBack();
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? `Error: ${error.error}` : 'Unknown error occured while deleting a label.', 'Dismiss', {
            duration: 5000
          });
          this.isLoading.set(false);
        }
      });
    }
  }
  
  onExecuteEditLabel() {
    const label = this.selectedLabel();

    if (label) {
      this.isLoading.set(true);
      this.labelService.updateLabel(label.id, {
        name: this.labelForm.value.name ?? '',
        color: this.labelForm.value.color ?? '',
        taskIds: label.taskIds
      }).subscribe({
        next: () => {                        
          this.isLoading.set(false);
          this.hasChangedLabels = true;
          this.snackBar.open(`Label ${label.id} has been changed.`, 'Dismiss', {
            duration: 3000
          })
          this.loadLabelsForProject(this.data.projectId);
          this.onBack();
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? `Error: ${error.error}` : 'Unknown error occured while deleting a label.', 'Dismiss', {
            duration: 5000
          });
          this.isLoading.set(false);
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

  private loadLabelsForProject(projectId: number) {
    this.isLoading.set(true);
    this.labelService.getLabelsForProject(projectId).subscribe({
      next: labels => {
        this.dataSource.data = labels;
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(error ? `Error: ${error.error}` : 'Unknown error occured while loading project labels.', 'Dismiss', {
          duration: 5000
        })
        this.isLoading.set(false);
      }
    })
  }
}
