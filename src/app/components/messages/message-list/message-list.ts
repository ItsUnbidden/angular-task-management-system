import { Component, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MessageService } from '../../../service/message.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CommentResponse, GeneralApiError, MessageResponse, SimpleApiError } from '../../../models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIcon } from "@angular/material/icon";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../util/confirm-dialog/confirm-dialog';
import { EMPTY, map, switchMap } from 'rxjs';
import { MessageStore } from '../../../cache/message.store';
import { getDefaultErrorMessageForType } from '../../../utils';
import { FlattenedReply } from '../../../cache/reply.store';
import { TaskStore } from '../../../cache/task.store';
import { UserStore } from '../../../cache/user.store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-message-list',
  imports: [MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatCardModule, MatButtonModule, MatListModule, MatIcon, MatProgressSpinnerModule],
  templateUrl: './message-list.html',
  styleUrl: './message-list.css',
})
export class MessageList {
  private readonly taskStore = inject(TaskStore);
  private readonly messageStore = inject(MessageStore)
  private readonly userStore = inject(UserStore);

  private readonly route = inject(ActivatedRoute);

  readonly taskCache = this.taskStore.selectedTaskCache;

  readonly commentCache = this.messageStore.commentsCache.asReadonly();
  readonly userCache = this.userStore.userCache.asReadonly();
  readonly isLastCommentsPage = this.messageStore.isLastCommentsPage;

  readonly isManager = this.userStore.isManager;

  readonly maxReplyDepth = 6;

  readonly taskId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('taskId')))), { initialValue: 0 }
  );

  readonly newCommentForm = new FormGroup({
    comment: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(255)
      ]
    })
  });

  readonly editMessageForm = new FormGroup({
    message: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(255)
      ]
    })
  });

  readonly newReplyForm = new FormGroup({
    reply: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(255)
      ]
    })
  });

  constructor(private readonly messageService: MessageService,
              private readonly snackBar: MatSnackBar,
              private readonly dialog: MatDialog) {
    effect(() => {
      const taskId = this.taskId();

      if (taskId) {
        this.messageStore.cacheMoreComments(taskId, 0).subscribe();
      }
    });
  }

  onNewCommentSubmit() {
    const message = this.newCommentForm.value.comment;
    const taskCache = this.taskCache();

    if (message && taskCache.item) {
      this.messageService.leaveComment(taskCache.item.id, { text: message }).subscribe({
        next: () => {
          this.taskCache.update(cache => {
            return { ...cache, item: cache.item ? { ...cache.item, amountOfMessages: ++cache.item.amountOfMessages } : undefined };
          });
          this.newCommentForm.patchValue({
            comment: ''
          }, {
            emitEvent: false
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as SimpleApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          })
        }
      })
    }
  }

  onEditMessage(message: MessageResponse) {
    this.enableEditing(message.id);
    this.editMessageForm.patchValue({
      message: message.text
    }, {
      emitEvent: false
    })
  }

  onEditMessageSubmit(message: MessageResponse, parent: CommentResponse | null) {
    const task = this.taskCache()?.item;
    const messageText = this.editMessageForm.value.message;

    if (task && messageText && messageText !== message.text) {
      this.messageService.updateMessage(message.id, { text: messageText }).pipe(
        switchMap(response => {
          if (this.isComment(response)) {
            return this.messageStore.cacheMoreComments(task.id, 0);
          }
          else if (parent) {
            return this.messageStore.cacheMoreReplies(parent.id, 0);
          }
          return EMPTY;
        }
      )).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
    this.disableEditing();
  }

  onEditMessageCancel() {
    this.disableEditing();
  }

  onDeleteMessage(message: MessageResponse) {
    const task = this.taskCache()?.item;

    if (task) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Delete message',
          message: 'Are you sure you want to delete this message?'
        }
      })
      .afterClosed()
      .pipe(
        switchMap(confirmed => {
          if (confirmed) {
            this.taskCache.update(cache => {
              return { ...cache, item: cache.item ? { ...cache.item, amountOfMessages: --cache.item.amountOfMessages } : undefined };
            });
            return this.messageService.deleteMessage(message.id);
          }         
          return EMPTY;
        }),
        switchMap(() => {
          return this.messageStore.cacheMoreComments(task.id, 0);
        })
      )
      .subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onMoreComments() {
    const task = this.taskCache().item;

    if (task) this.messageStore.cacheMoreComments(task.id, ++this.commentCache().pageIndex).subscribe();
  }

  onMoreReplies(commentId: number) {
    this.messageStore.cacheMoreReplies(commentId).subscribe();
  }

  onOpenCommentReplies(comment: CommentResponse) {
    this.setExpandComment(comment.id, true);
    if (this.userCache().item?.id !== comment.userId) this.enableReplying(comment.id);
    this.messageStore.cacheMoreReplies(comment.id).subscribe();
  }

  onNewReplySubmit(message: MessageResponse, superParent: CommentResponse | null) {
    if (this.isComment(message)) {
      this.setExpandComment(message.id, true);
    }
    this.messageService.replyToMessage(message.id, { text: this.newReplyForm.value.reply ?? '' }).pipe(
      switchMap(reply => {
        this.disableReplying();
        this.taskCache.update(cache => {
          return { ...cache, item: cache.item ? { ...cache.item, amountOfMessages: ++cache.item.amountOfMessages } : undefined };
        });
        if (this.isComment(message)) {
          return this.messageStore.cacheMoreReplies(message.id, 0);
        }
        if (superParent) {
          return this.messageStore.cacheMoreReplies(superParent.id, 0);
        }
        return EMPTY;
      }
    )).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  onReply(message: MessageResponse) {
    this.enableReplying(message.id);
  }

  onHideComments() {
    this.messageStore.clearComments();
    const task = this.taskCache().item;

    if (task) this.messageStore.cacheMoreComments(task.id, 0).subscribe();
  }

  onHideReplies(commentId: number) {
    this.messageStore.clearRepliesForComment(commentId);
    this.setExpandComment(commentId, false);
    this.disableReplying();
  }

  clampDepth(depth: number) : number {
    return Math.min(depth, this.maxReplyDepth);
  }

  getRepliesForComment(commentId: number) : FlattenedReply[] {
    const store = this.messageStore.replyStores().get(commentId);

    if (store) {
      return store.flattenedCache();
    }
    return [];
  }

  isCommentExpanded(commentId: number) : boolean {
    return this.messageStore.isCommentExpanded(commentId);
  }

  isLoadingRepliesForComment(commentId: number) : boolean {
    return this.messageStore.isLoadingRepliesForComment(commentId);
  }

  isReplying(messageId: number) : boolean {
    return this.messageStore.isReplying(messageId);
  }

  isEditing(messageId: number) : boolean {
    return this.messageStore.isEditing(messageId);
  }

  isLastRepliesPage(commentId: number) : boolean {
    const store = this.messageStore.replyStores().get(commentId);

    return store ? store.isLastRepliesPage() : false;
  }

  setExpandComment(commentId: number, isExpanded: boolean) {
    this.messageStore.setExpandComment(commentId, isExpanded);
  }

  enableReplying(messageId: number) {
    this.messageStore.enableReplying(messageId);
  }

  disableReplying() {
    this.messageStore.disableReplying();
  }

  enableEditing(messageId: number) {
    this.messageStore.enableEditing(messageId);
  }

  disableEditing() {
    this.messageStore.disableEditing();
  }

  private isComment(message: MessageResponse): message is CommentResponse {
    return "amountOfReplies" in message;
  }
}
