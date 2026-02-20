import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatButtonModule } from "@angular/material/button";
import { ProjectCreateRequest } from '../../../models';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-new-project-dialog',
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatNativeDateModule, MatDatepickerModule, MatButtonModule, MatCheckboxModule, MatIconModule],
  templateUrl: './new-project-dialog.html',
  styleUrl: './new-project-dialog.css',
})
export class NewProjectDialog {
  projectControl = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50)
    ]),
    description: new FormControl('', [
      Validators.maxLength(500)
    ]),
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
    isPrivate: new FormControl(false)
  });

  constructor(private dialogRef: MatDialogRef<NewProjectDialog, ProjectCreateRequest>) {}

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.projectControl.valid) {
      const result: ProjectCreateRequest = {
        name: this.projectControl.get('name')?.value || '',
        description: this.projectControl.get('description')?.value || undefined,
        startDate: this.toIsoDateString(this.projectControl.get('startDate')?.value ?? null),
        endDate: this.toIsoDateString(this.projectControl.get('endDate')?.value ?? null),
        isPrivate: this.projectControl.get('isPrivate')?.value || false,
      };
      this.dialogRef.close(result);
    }
  }

  private toIsoDateString(date: Date | null): string | undefined {
    return date ? date.toISOString().split('T')[0] : undefined;
  }
}
