import { computed, Injectable } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { MessageService } from '../service/message.service';
import { catchError, Observable, tap } from 'rxjs';
import { CommentResponse } from '../models/message.model';
import { Page } from '../models/general.model';

@Injectable({
  providedIn: 'root'
})
export class CommentStore extends AbstractStore<CommentResponse, never> {
  static readonly ITEMS_PER_PAGE = 10;

  readonly isLastCommentsPage = computed(() => {
    const currentCache = this.cache();

    return currentCache && currentCache.page
        ? CommentStore.ITEMS_PER_PAGE * (currentCache.pageIndex + 1) >= currentCache.page?.page.totalElements
        : false;
  });

  constructor(private readonly messageService: MessageService) { super() }

  cacheMoreComments(taskId: number, page: number) : Observable<Page<CommentResponse>> {
    this.preLoading(page, CommentStore.ITEMS_PER_PAGE);
    if (page === 0) {
      this.clearCache();
    }
    return this.messageService.getCommentsForTask(taskId, page, CommentStore.ITEMS_PER_PAGE).pipe(tap({
      next: (commentsPage) => {
        this.postLoading(commentsPage, true);
      }
    }),
    catchError(this.catchErrorDefault));
  }
}
