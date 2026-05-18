import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommentResponse, MessageCreateRequest, MessageResponse, Page, ReplyResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private readonly http: HttpClient) {}

  getCommentsForTask(taskId: number, page: number, size: number) : Observable<Page<CommentResponse>> {
    return this.http.get<Page<CommentResponse>>(`/api/messages/comments/tasks/${taskId}?page=${page}&size=${size}`);
  }

  getRepliesForComment(commentId: number, page: number, size: number) : Observable<Page<ReplyResponse>> {
    return this.http.get<Page<ReplyResponse>>(`/api/messages/comments/${commentId}/replies?page=${page}&size=${size}`);
  }

  leaveComment(taskId: number, request: MessageCreateRequest) : Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`/api/messages/comments/tasks/${taskId}`, request);
  }

  replyToMessage(messageId: number, request: MessageCreateRequest) : Observable<ReplyResponse> {
    return this.http.post<ReplyResponse>(`/api/messages/${messageId}/replies`, request);
  }

  updateMessage(messageId: number, request: MessageCreateRequest) : Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`/api/messages/${messageId}`, request);
  }

  deleteMessage(messageId: number) : Observable<void> {
    return this.http.delete<void>(`/api/messages/${messageId}`);
  }
}
