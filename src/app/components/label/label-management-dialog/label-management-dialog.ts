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
import { Observable, switchMap, tap } from 'rxjs';

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
  readonly displayedColumns = ['chip', 'edit', 'delete'];
  readonly dataSource = new MatTableDataSource<LabelResponse>([]);
  readonly selectedLabel = signal<LabelResponse | null>(null);
  readonly error = signal('');
  readonly isLoading = signal(false);
  readonly isEditing = signal(false);
  readonly isDeleting = signal(false);

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
    this.loadLabelsForProject(this.data.projectId).subscribe();
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
      this.labelService.deleteLabel(label.id).pipe(
        switchMap(() => this.loadLabelsForProject(this.data.projectId))
      ).subscribe({
        next: () => {                        
          this.hasChangedLabels = true;
          this.snackBar.open(`Label ${label.id} has been deleted.`, 'Dismiss', {
            duration: 3000
          });
          this.onBack();
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.errors[0] : 'Unknown error occured while deleting a label.', 'Dismiss', {
            duration: 5000
          });
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
      }).pipe(
        switchMap(() => this.loadLabelsForProject(this.data.projectId))
      ).subscribe({
        next: () => {                        
          this.hasChangedLabels = true;
          this.snackBar.open(`Label ${label.id} has been changed.`, 'Dismiss', {
            duration: 3000
          });
          this.onBack();
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.errors[0] : 'Unknown error occured while deleting a label.', 'Dismiss', {
            duration: 5000
          });
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

  private loadLabelsForProject(projectId: number) : Observable<LabelResponse[]> {
    this.isLoading.set(true);
    return this.labelService.getLabelsForProject(projectId).pipe(tap({
      next: labels => {
        this.dataSource.data = labels;
      },
      finalize: () => {
        this.isLoading.set(false);
      }
    }));
  }
}
