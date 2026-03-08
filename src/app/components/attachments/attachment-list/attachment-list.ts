import { Component, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AttachmentService } from '../../../service/attachment.service';
import { AttachmentResponse, GeneralApiError } from '../../../models';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskService } from '../../../service/task.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../util/confirm-dialog/confirm-dialog';

type ProgressBarMode = 'determinate' | 'indeterminate';

@Component({
  selector: 'app-attachment-list',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatSliderModule, MatProgressSpinnerModule],
  templateUrl: './attachment-list.html',
  styleUrl: './attachment-list.css',
})
export class AttachmentList {
  private attachmentService = inject(AttachmentService);

  readonly attachments = this.attachmentService.attachments;
  readonly uploadProgress = signal<number | null>(null);
  readonly progressBarMode = signal<ProgressBarMode>('determinate');
  readonly isLoadingAttachments = this.attachmentService.isLoading;

  constructor(private taskService: TaskService, private snackBar: MatSnackBar, private dialog: MatDialog) {
    effect(() => {
      const task = taskService.selectedTask();

      if (task) {
        this.attachmentService.cacheAttachmentsForTask(task.id);
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const task = this.taskService.selectedTask();

    if (file && task) {
      this.attachmentService.uploadFile(task.id, file).subscribe({
        next: event => {
          switch(event.type) {
            case HttpEventType.Sent: 
              this.uploadProgress.set(0);
              this.progressBarMode.set('determinate');
              break;
            case HttpEventType.UploadProgress:
              if (event.total) {
                const percent = Math.round(100 * event.loaded / event.total);
                if (percent >= 99) {
                  this.progressBarMode.set('indeterminate');
                } else {
                  this.uploadProgress.set(percent);
                }
              }
              break;
            case HttpEventType.Response:
              this.uploadProgress.set(null);
              this.attachmentService.cacheAttachmentsForTask(task.id);
              break;
          }
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? `Error: ${error.error}` : 'Unknown error occured while uploading a file.', 'Dismiss', {
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
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(error ? `Error: ${error.error}` : 'Unknown error occured while downloading an attachment.', 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  onDeleteAttachment(attachment: AttachmentResponse) {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete attachment',
        message: `Are you sure you want to delete file ${attachment.filename}? It will be deleted in the project's Dropbox folder too.`
      },
      disableClose: true,
      width: '420px'
    })
    .afterClosed()
    .subscribe(confirmed => {
      if (confirmed) {
        this.attachmentService.deleteAttachment(attachment.id).subscribe({
          next: () => {
            const task = this.taskService.selectedTask();

            if (task) {
              this.attachmentService.cacheAttachmentsForTask(task.id);
            }
          },
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.snackBar.open(error ? `Error: ${error.error}` : 'Unknown error occured while deleting an attachment.', 'Dismiss', {
              duration: 5000
            });
          }
        });
      }
    });
  }
}
