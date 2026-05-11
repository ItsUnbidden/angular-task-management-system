import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AttachmentService } from '../../../service/attachment.service';
import { AttachmentResponse, ExternalServiceApiError, SimpleApiError } from '../../../models';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../util/confirm-dialog/confirm-dialog';
import { EMPTY, switchMap } from 'rxjs';
import { AttachmentStore } from '../../../cache/attachment.store';
import { TaskStore } from '../../../cache/task.store';
import { getDefaultErrorMessageForExternalResult, getDefaultErrorMessageForType, isExternalError } from '../../../utils';

@Component({
  selector: 'app-attachment-list',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatSliderModule, MatProgressSpinnerModule],
  templateUrl: './attachment-list.html',
  styleUrl: './attachment-list.css',
})
export class AttachmentList {
  private static readonly MAX_FILE_SIZE = 157_286_400;

  private readonly attachmentStore = inject(AttachmentStore);

  readonly attachmentsCache = this.attachmentStore.cache.asReadonly();

  readonly isProgressBarActive = signal(false);
  
  constructor(private readonly attachmentService: AttachmentService, 
              private readonly taskStore: TaskStore,
              private readonly snackBar: MatSnackBar,
              private readonly dialog: MatDialog) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const task = this.taskStore.selectedTaskCache()?.item;

    if (file && task) {
      if (file.size >= AttachmentList.MAX_FILE_SIZE) {
        this.snackBar.open('The selected file is too large. Max file size is 150 MB.', 'Dismiss', {
          duration: 5000
        });
        return;
      }
      this.attachmentService.uploadFile(task.id, file).pipe(switchMap(event => {
        switch(event.type) {
          case HttpEventType.Sent: 
            this.isProgressBarActive.set(true);
            break;
          case HttpEventType.Response:
            this.isProgressBarActive.set(false);
            return this.attachmentStore.cacheAttachmentsForTask(task.id);
        }
        return EMPTY;
      }))
      .subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as SimpleApiError;
          const message = isExternalError(error) ? getDefaultErrorMessageForExternalResult(error) : getDefaultErrorMessageForType(error);

          this.isProgressBarActive.set(false);

          this.snackBar.open(message, 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onDownloadFile(attachment: AttachmentResponse) {
    this.attachmentService.downloadFile(attachment.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  onDeleteAttachment(attachment: AttachmentResponse) {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete attachment',
        message: `Are you sure you want to delete file <strong>${attachment.filename}</strong>? It will be deleted in the project's Dropbox folder too.`
      },
      disableClose: true,
      width: '420px'
    })
    .afterClosed().pipe(
      switchMap(confirmed => {
        if (confirmed) {
          this.isProgressBarActive.set(true);
          return this.attachmentService.deleteAttachment(attachment.id)
        };
        return EMPTY;
      }),
      switchMap(() => {
        const task = this.taskStore.selectedTaskCache()?.item;

        this.isProgressBarActive.set(false);
        if (task) return this.attachmentStore.cacheAttachmentsForTask(task.id);
        return EMPTY;
      })
    )
    .subscribe();
  }
}
