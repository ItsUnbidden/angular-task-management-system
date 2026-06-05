import { computed, effect, inject, Injectable } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { catchError, Observable, tap } from 'rxjs';
import { AttachmentService } from '../service/attachment.service';
import { TaskStore } from './task.store';
import { AttachmentResponse } from '../models/attachment.model';
import { Page } from '../models/general.model';

@Injectable({
  providedIn: 'root'
})
export class AttachmentStore extends AbstractStore<AttachmentResponse, never> {
  private readonly taskStore = inject(TaskStore);

  private readonly selectedTaskId = computed(() => {
    const selectedTask = this.taskStore.selectedTaskCache().item;

    return selectedTask?.id ?? 0;
  });

  constructor(private readonly attachmentService: AttachmentService) {
    super();

    effect(() => {
      const taskId = this.selectedTaskId();

      if (taskId) this.cacheAttachmentsForTask(taskId).subscribe();
    });
  }

  cacheAttachmentsForTask(taskId: number) : Observable<Page<AttachmentResponse>> {
    this.preLoading(0, -1);
    return this.attachmentService.getAttachmentsForTask(taskId)
    .pipe(
      tap({
        next: page => {
          this.postLoading(page);
        }
      }),
      catchError(this.catchErrorDefault)
    );
  }
}
