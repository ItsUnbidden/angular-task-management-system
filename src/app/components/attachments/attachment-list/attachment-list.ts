import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AttachmentService } from '../../../service/attachment.service';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../util/confirm-dialog/confirm-dialog';
import { EMPTY, switchMap } from 'rxjs';
import { AttachmentStore } from '../../../cache/attachment.store';
import { TaskStore } from '../../../cache/task.store';
import { getDefaultErrorMessageForType } from '../../../utils';
import { SimpleApiError } from '../../../models/error.model';
import { AttachmentResponse } from '../../../models/attachment.model';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService } from '../../../service/notification.service';

@Component({
  selector: 'app-attachment-list',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatSliderModule, MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './attachment-list.html',
  styleUrl: './attachment-list.css',
})
export class AttachmentList {
  private static readonly MAX_FILE_SIZE = 157_286_400;

  private readonly attachmentStore = inject(AttachmentStore);

  protected readonly attachmentsCache = this.attachmentStore.cache.asReadonly();

  protected readonly isProgressBarActive = signal(false);
  
  constructor(private readonly attachmentService: AttachmentService, 
              private readonly taskStore: TaskStore,
              private readonly notification: NotificationService,
              private readonly dialog: MatDialog) {}

  protected onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const task = this.taskStore.selectedTaskCache()?.item;

    if (file && task) {
      if (file.size >= AttachmentList.MAX_FILE_SIZE) {
        this.notification.info('attachment.error.fileTooLarge', 7000);
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

          this.isProgressBarActive.set(false);

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
  }

  protected onDownloadFile(attachment: AttachmentResponse) {
    this.attachmentService.downloadFile(attachment.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: SimpleApiError) => {
        this.isProgressBarActive.set(false);

        this.notification.info(getDefaultErrorMessageForType(err), 10000);
        const selectedTask = this.taskStore.selectedTaskCache().item;

        if (selectedTask) this.attachmentStore.cacheAttachmentsForTask(selectedTask.id).subscribe();
      }
    });
  }

  protected onDeleteAttachment(attachment: AttachmentResponse) {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: { key: 'attachment.confirm.delete.title' },
        message: { key: 'attachment.confirm.delete.message', params: { filename: attachment.filename } }
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
        this.notification.info('attachment.success.delete', 5000, { filename: attachment.filename });
        if (task) return this.attachmentStore.cacheAttachmentsForTask(task.id);
        return EMPTY;
      })
    )
    .subscribe();
  }
}
