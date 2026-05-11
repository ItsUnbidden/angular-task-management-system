import { inject, Injectable, signal } from '@angular/core';
import { CommentResponse, Page } from '../models';
import { MessageService } from '../service/message.service';
import { Observable, tap } from 'rxjs';
import { FlattenedReply, ReplyStore } from './reply.store';
import { CommentStore } from './comment.store';

export interface MessageState {
  isReplying: boolean;
  isEditing: boolean;
}

export interface CommentState extends MessageState {
  isExpanded: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessageStore {
  readonly commentStore = inject(CommentStore);

  readonly replyStores = signal(new Map<number, ReplyStore>());
  readonly messageStates = signal(new Map<number, MessageState>);

  readonly commentsCache = this.commentStore.cache;

  constructor(private readonly messageService: MessageService) {}

  cacheMoreComments(taskId: number, page: number) : Observable<Page<CommentResponse>> {
    return this.commentStore.cacheMoreComments(taskId, page).pipe(tap({
      next: (page) => {
        this.messageStates.update(map => {
          const newMessageStates = new Map(map);
          
          page.content.forEach(c => {
            const initialState: CommentState = { isExpanded: false, isReplying: false, isEditing: false };

            newMessageStates.set(c.id, initialState);
          })
          return newMessageStates;
        })
      }
    }));
  }

  cacheMoreReplies(commentId: number) : Observable<FlattenedReply[]>;
  cacheMoreReplies(commentId: number, page: number) : Observable<FlattenedReply[]>;

  cacheMoreReplies(commentId: number, page?: number) : Observable<FlattenedReply[]> {
    let store = this.replyStores().get(commentId);

    if (!store) {
      const newStore = new ReplyStore(this.messageService);
      this.replyStores.update(stores => {
        const newStoresMap = new Map(stores);

        newStoresMap.set(commentId, newStore);
        return newStoresMap;
      });
      store = newStore;
    }
    const currentPage = store.cache().page?.number ?? 0;

    return store.cacheMoreReplies(commentId, page ?? currentPage).pipe(tap({
      next: flattenedReplies => {
        this.messageStates.update(map => {
          const newMessageStates = new Map(map);

          flattenedReplies.forEach(fr => {
            const initialState: MessageState = { isReplying: false, isEditing: false };

            newMessageStates.set(fr.id, initialState);
          })
          return newMessageStates;
        })
      }
    }));
  }

  clearComments() {
    this.commentStore.clearCache();
  }

  clearRepliesForComment(commentId: number) {
    this.replyStores.update(stores => {
      const newStoreMap = new Map(stores);

      newStoreMap.delete(commentId);
      return newStoreMap;
    });
  }

  isCommentExpanded(commentId: number) : boolean {
    const state = this.messageStates().get(commentId);

    return (state && this.isCommentState(state)) ? state.isExpanded : false;
  }

  isLoadingRepliesForComment(commentId: number) : boolean {
    const store = this.replyStores().get(commentId);

    return (store) ? store.cache().isLoading : false;
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

  private isCommentState(state: MessageState) : state is CommentState {
    return 'isExpanded' in state;
  }
}
