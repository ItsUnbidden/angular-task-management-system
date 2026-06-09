import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogRef, MatDialogTitle, MatDialogActions } from "@angular/material/dialog";
import { TranslatePipe } from '@ngx-translate/core';

export interface Key {
  key: string;
  params?: Object;
}

export interface ConfirmDialogData {
  title?: Key;
  message: Key;
  cancelButton?: string;
  submitButton?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogContent, MatDialogTitle, MatDialogActions, MatButtonModule, TranslatePipe],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  constructor(private readonly dialogRef: MatDialogRef<ConfirmDialog, boolean>,
              @Inject(MAT_DIALOG_DATA) public readonly data: ConfirmDialogData) {}

  protected close(result: boolean) {
    this.dialogRef.close(result);
  }
}
