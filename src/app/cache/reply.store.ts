import { computed, signal } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { Page, ReplyResponse } from '../models';
import { map, Observable, tap } from 'rxjs';
import { MessageService } from '../service/message.service';

export interface FlattenedReply extends ReplyResponse {
  depth: number;
}

export class ReplyStore extends AbstractStore<ReplyResponse, never> {
  static readonly ITEMS_PER_PAGE = 10;

  readonly isLastRepliesPage = computed(() => {
    const currentCache = this.cache();

    return currentCache && currentCache.page
        ? ReplyStore.ITEMS_PER_PAGE * (currentCache.pageIndex + 1) >= currentCache.page?.totalElements
        : false;
  });
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
      }
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
