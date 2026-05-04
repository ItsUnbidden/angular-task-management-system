import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { map, Observable, switchMap, tap } from 'rxjs';
import { CommentResponse, MessageCreateRequest, MessageResponse, Page, ReplyResponse } from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private readonly http: HttpClient) {}

  getCommentsForTask(taskId: number, page: number, size: number) : Observable<Page<CommentResponse>> {
    return this.http.get<Page<CommentResponse>>(`${environment.apiUrl}/api/messages/comments/tasks/${taskId}?page=${page}&size=${size}`);
  }

  getRepliesForComment(commentId: number, page: number, size: number) : Observable<Page<ReplyResponse>> {
    return this.http.get<Page<ReplyResponse>>(`${environment.apiUrl}/api/messages/comments/${commentId}/replies?page=${page}&size=${size}`);
  }

  leaveComment(taskId: number, request: MessageCreateRequest) : Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${environment.apiUrl}/api/messages/comments/tasks/${taskId}`, request);
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
}
