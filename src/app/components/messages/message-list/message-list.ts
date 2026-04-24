import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { TaskService } from '../../../service/task.service';
import { MessageService, ReplyCache } from '../../../service/message.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CommentResponse, GeneralApiError, MessageResponse, Page, ReplyResponse } from '../../../models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../service/user.service';
import { MatIcon } from "@angular/material/icon";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../util/confirm-dialog/confirm-dialog';
import { EMPTY, Observable, pipe, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-message-list',
  imports: [MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatCardModule, MatButtonModule, MatListModule, MatIcon, MatProgressSpinnerModule],
  templateUrl: './message-list.html',
  styleUrl: './message-list.css',
})
export class MessageList {
  private readonly taskService = inject(TaskService);
  private readonly messageService = inject(MessageService);
  private readonly userService = inject(UserService);

  readonly task = this.taskService.selectedTask;
  readonly comments = this.messageService.comments;
  readonly user = this.userService.user;

  readonly isLoadingComments = this.messageService.isLoadingComments;
  readonly isLastCommentsPage = signal(false);

  readonly isManager = this.userService.isManager;

  readonly maxReplyDepth = 6;

  currentCommentsPage = 0;

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

  constructor(private readonly snackBar: MatSnackBar, private readonly dialog: MatDialog) {
    effect(() => {
      this.loadComments(0).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while loading comments.', 'Dismiss', {
            duration: 5000
          });
        }
      });
    });
  }

  onNewCommentSubmit() {
    const message = this.newCommentForm.value.comment;
    const task = this.task();

    if (message && task) {
      this.messageService.leaveComment(task.id, { text: message }).subscribe({
        next: () => {
          this.task.update(t => {
            if (t) {
              t.amountOfMessages++;
            }
            return t;
          })
          this.newCommentForm.patchValue({
            comment: ''
          }, {
            emitEvent: false
          })
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while loading comments.', 'Dismiss', {
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
    const task = this.task();
    const messageText = this.editMessageForm.value.message;

    if (task && messageText && messageText !== message.text) {
      this.messageService.updateMessage(message.id, { text: messageText }).pipe(
        switchMap(response => {
          if (this.isComment(response)) {
            this.messageService.clearComments();
            return this.loadComments(0);
          }
          else if (parent) {
            this.messageService.clearRepliesForComment(parent.id);
            return this.loadReplies(parent.id, 0);
          }
          return EMPTY;
        }
      )).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while editing a message.', 'Dismiss', {
            duration: 5000
          })
        }
      })
    }
    this.disableEditing();
  }

  onEditMessageCancel() {
    this.disableEditing();
  }

  onDeleteMessage(message: MessageResponse) {
    const task = this.task();

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
            return this.messageService.deleteMessage(message.id);
          }         
          return EMPTY;
        }),
        switchMap(() => {
          this.messageService.clearComments();
          return this.loadComments(0);
        })
      )
      .subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while deleting a message.', 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }

  onMoreComments() {
    this.loadComments(++this.currentCommentsPage).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while loading more comments.', 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  onMoreReplies(commentId: number) {
    this.messageService.replies.update(replies => {
        const newCache = new Map(replies);
        const replyCache = newCache.get(commentId);

        if (replyCache) {
          ++replyCache.page;
        } 
        return newCache;
    })
    const currentReplyCache = this.messageService.replies().get(commentId);

    if (currentReplyCache) {
      this.loadReplies(commentId, currentReplyCache.page).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while loading more replies.', 'Dismiss', {
            duration: 5000
          });
        }
      })
    }
  }

  onOpenCommentReplies(comment: CommentResponse) {
    this.setExpandComment(comment.id, true);
    this.enableReplying(comment.id);
    this.messageService.loadMoreRepliesForComment(comment.id, 0).subscribe();
  }

  onNewReplySubmit(message: MessageResponse, superParent: CommentResponse | null) {
    if (this.isComment(message)) {
      this.setExpandComment(message.id, true);
      this.setLoadingReplies(message.id, true);
    }
    this.messageService.replyToMessage(message.id, { text: this.newReplyForm.value.reply ?? '' }).pipe(
      switchMap(reply => {
        if (this.isComment(message)) {
          this.setLoadingReplies(message.id, false);
          this.messageService.clearRepliesForComment(message.id);
          return this.messageService.loadMoreRepliesForComment(message.id, 0);
        }
        if (superParent) {
          this.messageService.clearRepliesForComment(superParent.id);
          return this.messageService.loadMoreRepliesForComment(superParent.id, 0);
        }
        this.disableReplying();
        return EMPTY;
      }
    )).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while submitting a new reply.', 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  onReply(message: MessageResponse) {
    this.enableReplying(message.id);
  }

  onHideComments() {
    this.messageService.clearComments();
    this.currentCommentsPage = 0;
    this.loadComments(0).subscribe({
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while deleting a message.', 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  onHideReplies(commentId: number) {
    this.messageService.clearRepliesForComment(commentId);
    this.setExpandComment(commentId, false);
    this.disableReplying();
  }

  clampDepth(depth: number) : number {
    return Math.min(depth, this.maxReplyDepth);
  }

  getRepliesForComment(commentId: number) : ReplyCache | null {
    return this.messageService.replies().get(commentId) ?? null;
  }

  isCommentExpanded(commentId: number) : boolean {
    return this.messageService.isCommentExpanded(commentId);
  }

  isLoadingRepliesForComment(commentId: number) : boolean {
    return this.messageService.isLoadingRepliesForComment(commentId);
  }

  isReplying(messageId: number) : boolean {
    return this.messageService.isReplying(messageId);
  }

  isEditing(messageId: number) : boolean {
    return this.messageService.isEditing(messageId);
  }

  isLastRepliesPage(commentId: number) : boolean {
    return this.messageService.replies().get(commentId)?.isLastRepliesPage ?? true;
  }

  setExpandComment(commentId: number, isExpanded: boolean) {
    this.messageService.setExpandComment(commentId, isExpanded);
  }

  setLoadingReplies(commentId: number, isLoading: boolean) {
    this.messageService.setLoadingReplies(commentId, isLoading);
  }

  enableReplying(messageId: number) {
    this.messageService.enableReplying(messageId);
  }

  disableReplying() {
    this.messageService.disableReplying();
  }

  enableEditing(messageId: number) {
    this.messageService.enableEditing(messageId);
  }

  disableEditing() {
    this.messageService.disableEditing();
  }

  private isComment(message: MessageResponse): message is CommentResponse {
    return "amountOfReplies" in message;
  }

  private loadComments(page: number) : Observable<Page<CommentResponse>> {
    const task = this.task();

    if (task) {
      return this.messageService.loadMoreCommentsForTask(task.id, page).pipe(tap({
        next: () => {
          this.isLastCommentsPage.set((this.currentCommentsPage + 1) * this.messageService.itemsPageSize >= this.messageService.totalComments());
        }
      }));
    }
    return EMPTY;
  }

  private loadReplies(commentId: number, page: number) : Observable<Page<ReplyResponse>> {
    return this.messageService.loadMoreRepliesForComment(commentId, page);
  }
}
