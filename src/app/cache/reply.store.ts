import { computed, signal } from '@angular/core';
import { catchError, EMPTY, finalize, map, Observable } from 'rxjs';
import { MessageService } from '../service/message.service';
import { FlattenedReply, ReplyResponse } from '../models/message.model';
import { HttpErrorResponse } from '@angular/common/http';
import { getDefaultErrorMessageForType } from '../utils';
import { SimpleApiError } from '../models/error.model';

export class ReplyStore {
  readonly cache = signal<ReplyResponse[]>([]);
  readonly error = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  readonly flattenedCache = computed(() => {
    const repliesCache = this.cache();

    return this.flattenReplies(repliesCache, 0);
  });

  constructor(private readonly messageService: MessageService) {}

  cacheReplies(commentId: number) : Observable<FlattenedReply[]> {
    this.isLoading.set(true);
    return this.messageService.getRepliesForComment(commentId).pipe(
      map((replies) => {
          this.cache.set(replies);
          return this.flattenedCache();
      }),
      catchError((err: HttpErrorResponse) => {
        const error = err.error as SimpleApiError;
      
        this.error.set(getDefaultErrorMessageForType(error));
        return EMPTY;
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  private flattenReplies(replies: ReplyResponse[], depth: number) : FlattenedReply[] {
    const result: FlattenedReply[] = [];

    for (const reply of replies) {
      result.push({ ...reply, depth: depth });
      if (reply.replyDtos.length !== 0) {
        result.push(...this.flattenReplies(reply.replyDtos, depth + 1));
      }
    }
    return result;
  }
}
