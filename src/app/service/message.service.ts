import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { map, Observable, switchMap, tap } from 'rxjs';
import { CommentResponse, MessageCreateRequest, MessageResponse, Page, ReplyResponse } from '../models';
import { environment } from '../../environments/environment';

export interface FlattenedReply {
  reply: ReplyResponse;
  depth: number;
}

export interface ReplyCache {
  replies: FlattenedReply[];
  totalReplies: number;
  page: number;
  isLastRepliesPage: boolean;
}

export interface MessageState {
  isReplying: boolean;
  isEditing: boolean;
}

export interface CommentState extends MessageState {
  isExpanded: boolean;
  isLoadingReplies: boolean;
  
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  readonly comments = signal<CommentResponse[]>([]);
  readonly totalComments = signal(0);
  readonly replies = signal(new Map<number, ReplyCache>());
  readonly isLoadingComments = signal(false);
  readonly messageStates = signal(new Map<number, MessageState>);

  readonly itemsPageSize = 2;

  constructor(private readonly http: HttpClient) {}

  loadMoreCommentsForTask(taskId: number, page: number) : Observable<Page<CommentResponse>> {
    this.isLoadingComments.set(true);
    if (page === 0) {
      this.clearComments();
    }
    return this.getCommentsForTask(taskId, page, this.itemsPageSize).pipe(tap({
      next: (commentsPage) => {
        this.comments.update(cached => {
          return cached.concat(commentsPage.content);
        });
        this.messageStates.update(map => {
          const newMessageStates = new Map(map);
          
          commentsPage.content.forEach(c => {
            const initialState: CommentState = { isExpanded: false, isLoadingReplies: false, isReplying: false, isEditing: false };

            newMessageStates.set(c.id, initialState);
          })
          return newMessageStates;
        })
        this.totalComments.set(commentsPage.totalElements);
      },
      finalize: () => {
        this.isLoadingComments.set(false);
      }
    }));
  }

  clearComments() {
    this.comments.set([]);
  }

  loadMoreRepliesForComment(commentId: number, page: number) : Observable<Page<ReplyResponse>> {
    this.setLoadingReplies(commentId, true);
    return this.getRepliesForComment(commentId, page, this.itemsPageSize).pipe(tap({
      next: (replies) => {
        const flattenedReplies = this.flattenReplies(replies.content, 1);

        this.replies.update(cached => {
          const newCache = new Map(cached);
          const currentCache = this.replies().get(commentId);
          const isLastRepliesPage = this.itemsPageSize * (page + 1) >= replies.totalElements;

          newCache.set(commentId, { replies: (currentCache) ? currentCache.replies.concat(flattenedReplies) : flattenedReplies, totalReplies: replies.totalElements, page, isLastRepliesPage });

          return newCache;
        });
        this.messageStates.update(map => {
          const newMessageStates = new Map(map);

          flattenedReplies.forEach(fr => {
            const initialState: MessageState = { isReplying: false, isEditing: false };

            newMessageStates.set(fr.reply.id, initialState);
          })
          return newMessageStates;
        })
      },
      finalize: () => {
        this.isLoadingComments.set(false);
      }
    }));
  }

  clearRepliesForComment(commentId: number) {
    this.replies.update(replies => {
      const newReplies = new Map(replies);

      newReplies.delete(commentId);
      return newReplies;
    });
  }

  isCommentExpanded(commentId: number) : boolean {
    const state = this.messageStates().get(commentId);

    return (state && this.isCommentState(state)) ? state.isExpanded : false;
  }

  isLoadingRepliesForComment(commentId: number) : boolean {
    const state = this.messageStates().get(commentId);

    return (state && this.isCommentState(state)) ? state.isLoadingReplies : false;
  }

  isReplying(messageId: number) : boolean {
    return this.messageStates().get(messageId)?.isReplying ?? false;
  }

  isEditing(messageId: number) : boolean {
    return this.messageStates().get(messageId)?.isEditing ?? false;
  }

  setExpandComment(commentId: number, isExpanded: boolean) {
    this.messageStates.update(states => {
      const newStatesMap = new Map(states);
      const currentState = newStatesMap.get(commentId);

      if (currentState && this.isCommentState(currentState)) {
        const newState: CommentState = { ...currentState, isExpanded: isExpanded };

        newStatesMap.set(commentId, newState);
      }
      return newStatesMap;
    })
  }

  setLoadingReplies(commentId: number, isLoading: boolean) {
    this.messageStates.update(states => {
      const newStatesMap = new Map(states);
      const currentState = newStatesMap.get(commentId);

      if (currentState && this.isCommentState(currentState)) {
        const newState: CommentState = { ...currentState, isLoadingReplies: isLoading };

        newStatesMap.set(commentId, newState);
      }
      return newStatesMap;
    })
  }

  enableReplying(messageId: number) {
    this.messageStates.update(states => {
      const newStatesMap = new Map(states);

      newStatesMap.forEach((ms, k) => {
        ms.isEditing = false;
        ms.isReplying = false;
      })
      const currentState = newStatesMap.get(messageId);

      if (currentState) {
        newStatesMap.set(messageId, { ...currentState, isReplying: true });
      }
      return newStatesMap;
    })
  }

  disableReplying() {
    this.messageStates.update(states => {
      const newStatesMap = new Map(states);

      newStatesMap.forEach((ms, k) => {
        ms.isReplying = false;
      })     
      return newStatesMap;
    })
  }

  enableEditing(messageId: number) {
    this.messageStates.update(states => {
      const newStatesMap = new Map(states);

      newStatesMap.forEach((ms, k) => {
        ms.isEditing = false;
        ms.isReplying = false;
      })
      const currentState = newStatesMap.get(messageId);

      if (currentState) {
        newStatesMap.set(messageId, { ...currentState, isEditing: true });
      }
      return newStatesMap;
    })
  }

  disableEditing() {
    this.messageStates.update(states => {
      const newStatesMap = new Map(states);

      newStatesMap.forEach((ms, k) => {
        ms.isEditing = false;
      })     
      return newStatesMap;
    })
  }

  getCommentsForTask(taskId: number, page: number, size: number) : Observable<Page<CommentResponse>> {
    return this.http.get<Page<CommentResponse>>(`${environment.apiUrl}/api/messages/comments/tasks/${taskId}?page=${page}&size=${size}`);
  }

  getRepliesForComment(commentId: number, page: number, size: number) : Observable<Page<ReplyResponse>> {
    return this.http.get<Page<ReplyResponse>>(`${environment.apiUrl}/api/messages/comments/${commentId}/replies?page=${page}&size=${size}`);
  }

  leaveComment(taskId: number, request: MessageCreateRequest) : Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${environment.apiUrl}/api/messages/comments/tasks/${taskId}`, request).pipe(
      tap({
        next: message => {
          this.clearComments();
        }
      }),
      switchMap(message => {
        return this.loadMoreCommentsForTask(taskId, 0).pipe(map(() => message));
      })
    );
  }

  replyToMessage(messageId: number, request: MessageCreateRequest) : Observable<ReplyResponse> {
    return this.http.post<ReplyResponse>(`${environment.apiUrl}/api/messages/${messageId}/replies`, request);
  }

  updateMessage(messageId: number, request: MessageCreateRequest) : Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${environment.apiUrl}/api/messages/${messageId}`, request);
  }

  deleteMessage(messageId: number) : Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/messages/${messageId}`);
  }
  
  private flattenReplies(replies: ReplyResponse[], depth: number) : FlattenedReply[] {
    const result: FlattenedReply[] = [];

    for (const reply of replies) {
      result.push({ reply: reply, depth: depth });
      if (reply.replyDtos.length !== 0) {
        result.push(...this.flattenReplies(reply.replyDtos, depth + 1));
      }
    }
    return result;
  }

  private isCommentState(state: MessageState) : state is CommentState {
    return 'isExpanded' in state;
  }
}
