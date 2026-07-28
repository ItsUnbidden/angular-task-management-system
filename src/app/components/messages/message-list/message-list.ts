import { Component, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MessageService } from '../../../service/message.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIcon } from "@angular/material/icon";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../util/confirm-dialog/confirm-dialog';
import { EMPTY, map, switchMap } from 'rxjs';
import { MessageStore } from '../../../cache/message.store';
import { getDefaultErrorMessageForType } from '../../../utils';
import { TaskStore } from '../../../cache/task.store';
import { UserStore } from '../../../cache/user.store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ValidationBoundaries } from '../../../config/validation-boundaries';
import { GeneralApiError, SimpleApiError } from '../../../models/error.model';
import { CommentResponse, FlattenedReply, MessageResponse } from '../../../models/message.model';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService } from '../../../service/notification.service';

@Component({
  selector: 'app-message-list',
  imports: [MatFormFieldModule, ReactiveFormsModule, MatInputModule,
            MatCardModule, MatButtonModule, MatListModule,
            MatIcon, MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './message-list.html',
  styleUrl: './message-list.css',
})
export class MessageList {
  protected readonly MAX_LENGTH = ValidationBoundaries.MESSAGE_MAX_LENGTH;

  private readonly taskStore = inject(TaskStore);
  private readonly messageStore = inject(MessageStore)
  private readonly userStore = inject(UserStore);

  private readonly route = inject(ActivatedRoute);

  protected readonly taskCache = this.taskStore.selectedTaskCache;

  protected readonly commentCache = this.messageStore.commentsCache.asReadonly();
  protected readonly userCache = this.userStore.userCache.asReadonly();

  protected readonly isLastCommentsPage = this.messageStore.commentStore.isLastCommentsPage;

  protected readonly isManager = this.userStore.isManager;

  protected readonly maxReplyDepth = 6;

  private readonly taskId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('taskId')))), { initialValue: 0 }
  );

  protected readonly newCommentForm = new FormGroup({
    comment: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(ValidationBoundaries.MESSAGE_MAX_LENGTH)
      ]
    })
  });

  protected readonly editMessageForm = new FormGroup({
    message: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(ValidationBoundaries.MESSAGE_MAX_LENGTH)
      ]
    })
  });

  protected readonly newReplyForm = new FormGroup({
    reply: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(ValidationBoundaries.MESSAGE_MAX_LENGTH)
      ]
    })
  });

  constructor(private readonly messageService: MessageService,
              private readonly notification: NotificationService,
              private readonly dialog: MatDialog) {
    effect(() => {
      const taskId = this.taskId();

      if (taskId) {
        this.messageStore.cacheMoreComments(taskId, 0).subscribe();
      }
    });
  }

  protected onNewCommentSubmit() {
    const message = this.newCommentForm.value.comment;
    const taskCache = this.taskCache();

    if (message && taskCache.item) {
      this.messageService.leaveComment(taskCache.item.id, { text: message }).pipe(
        switchMap(() => {
          this.messageStore.clearComments();
          return this.messageStore.cacheMoreComments(this.taskId(), 0);
        })).subscribe({
        next: () => {
          this.taskCache.update(cache => {
            return { ...cache, item: cache.item ? { ...cache.item, numberOfMessages: ++cache.item.numberOfMessages } : undefined };
          });
          this.newCommentForm.patchValue({
            comment: ''
          }, {
            emitEvent: false
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as SimpleApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      })
    }
  }

  protected onEditMessage(message: MessageResponse) {
    this.enableEditing(message.id);
    this.editMessageForm.patchValue({
      message: message.text
    }, {
      emitEvent: false
    })
  }

  protected onEditMessageSubmit(message: MessageResponse, parent: CommentResponse | null) {
    const task = this.taskCache()?.item;
    const messageText = this.editMessageForm.value.message;

    if (task && messageText && messageText !== message.text) {
      this.messageService.updateMessage(message.id, { text: messageText }).pipe(
        switchMap(response => {
          if (this.isComment(response)) {
            return this.messageStore.cacheMoreComments(task.id, 0);
          }
          else if (parent) {
            return this.messageStore.cacheMoreReplies(parent.id);
          }
          return EMPTY;
        }
      )).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
    this.disableEditing();
  }

  protected onEditMessageCancel() {
    this.disableEditing();
  }

  protected onDeleteMessage(message: MessageResponse) {
    const task = this.taskCache()?.item;

    if (task) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: { key: 'message.confirm.delete.title' },
          message: { key: 'message.confirm.delete.message' }
        }
      })
      .afterClosed()
      .pipe(
        switchMap(confirmed => {
          if (confirmed) {
            this.taskCache.update(cache => {
              return { ...cache, item: cache.item ? { ...cache.item, numberOfMessages: --cache.item.numberOfMessages } : undefined };
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

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
  }

  protected onMoreComments() {
    const task = this.taskCache().item;

    if (task) this.messageStore.cacheMoreComments(task.id, ++this.commentCache().pageIndex).subscribe();
  }

  protected onMoreReplies(commentId: number) {
    this.messageStore.cacheMoreReplies(commentId).subscribe();
  }

  protected onOpenCommentReplies(comment: CommentResponse) {
    this.setExpandComment(comment.id, true);
    if (this.userCache().item?.id !== comment.userId) this.enableReplying(comment.id);
    this.messageStore.cacheMoreReplies(comment.id).subscribe();
  }

  protected onNewReplySubmit(message: MessageResponse, superParent: CommentResponse | null) {
    if (this.isComment(message)) {
      this.setExpandComment(message.id, true);
    }
    this.messageService.replyToMessage(message.id, { text: this.newReplyForm.value.reply ?? '' }).pipe(
      switchMap(reply => {
        this.disableReplying();
        this.taskCache.update(cache => {
          return { ...cache, item: cache.item ? { ...cache.item, numberOfMessages: ++cache.item.numberOfMessages } : undefined };
        });
        if (this.isComment(message)) {
          return this.messageStore.cacheMoreReplies(message.id);
        }
        if (superParent) {
          return this.messageStore.cacheMoreReplies(superParent.id);
        }
        return EMPTY;
      }
    )).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.notification.info(getDefaultErrorMessageForType(error), 10000);
      }
    });
  }

  protected onReply(message: MessageResponse) {
    this.enableReplying(message.id);
  }

  protected onHideComments() {
    this.messageStore.clearComments();
    const task = this.taskCache().item;

    if (task) this.messageStore.cacheMoreComments(task.id, 0).subscribe();
  }

  protected onHideReplies(commentId: number) {
    this.messageStore.clearRepliesForComment(commentId);
    this.setExpandComment(commentId, false);
    this.disableReplying();
  }

  protected clampDepth(depth: number) : number {
    return Math.min(depth, this.maxReplyDepth);
  }

  protected getRepliesForComment(commentId: number) : FlattenedReply[] {
    const store = this.messageStore.replyStores().get(commentId);

    if (store) {
      return store.flattenedCache();
    }
    return [];
  }

  protected isCommentExpanded(commentId: number) : boolean {
    return this.messageStore.isCommentExpanded(commentId);
  }

  protected isLoadingRepliesForComment(commentId: number) : boolean {
    return this.messageStore.isLoadingRepliesForComment(commentId);
  }

  protected isReplying(messageId: number) : boolean {
    return this.messageStore.isReplying(messageId);
  }

  protected isEditing(messageId: number) : boolean {
    return this.messageStore.isEditing(messageId);
  }

  protected setExpandComment(commentId: number, isExpanded: boolean) {
    this.messageStore.setExpandComment(commentId, isExpanded);
  }

  protected enableReplying(messageId: number) {
    this.messageStore.enableReplying(messageId);
  }

  protected disableReplying() {
    this.messageStore.disableReplying();
  }

  protected enableEditing(messageId: number) {
    this.messageStore.enableEditing(messageId);
  }

  protected disableEditing() {
    this.messageStore.disableEditing();
  }

  private isComment(message: MessageResponse): message is CommentResponse {
    return "numberOfReplies" in message;
  }
}
