import { computed } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { catchError, map, Observable } from 'rxjs';
import { MessageService } from '../service/message.service';
import { FlattenedReply, ReplyResponse } from '../models/message.model';

export class ReplyStore extends AbstractStore<ReplyResponse, never> {
  static readonly ITEMS_PER_PAGE = 10;

  readonly flattenedCache = computed(() => {
    const repliesCache = this.cache();

    return this.flattenReplies(repliesCache.page?.content ?? [], 0);
  });

  constructor(private readonly messageService: MessageService) { super() }

  cacheMoreReplies(commentId: number, page: number) : Observable<FlattenedReply[]> {
    this.preLoading(page, ReplyStore.ITEMS_PER_PAGE);
    if (page === 0) {
      this.clearCache();
    }
    return this.messageService.getRepliesForComment(commentId, page, ReplyStore.ITEMS_PER_PAGE).pipe(
      map((replies) => {
        this.postLoading(replies, true);
        return this.flattenReplies(replies.content, 0);
      },
      catchError(this.catchErrorDefault)
    ));
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
