import { Injectable } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { AttachmentResponse, Page, SimpleApiError } from '../models';
import { catchError, EMPTY, Observable, tap } from 'rxjs';
import { AttachmentService } from '../service/attachment.service';
import { HttpErrorResponse } from '@angular/common/http';
import { getDefaultErrorMessageForType } from '../utils';

@Injectable()
export class AttachmentStore extends AbstractStore<AttachmentResponse, never> {
  constructor(private readonly attachmentService: AttachmentService) { super() }

  cacheAttachmentsForTask(taskId: number) : Observable<Page<AttachmentResponse>> {
    this.preLoading(0, -1);
    return this.attachmentService.getAttachmentsForTask(taskId)
    .pipe(
      tap({
        next: page => {
          this.clearCache();
          this.postLoading(page);
        }
      }),
      catchError((err: HttpErrorResponse) => {
        const error = err.error as SimpleApiError;

        this.postLoading(getDefaultErrorMessageForType(error));
        return EMPTY;
      })
    );
  }
}
