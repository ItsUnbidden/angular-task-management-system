import { Injectable } from '@angular/core';
import { AttachmentResponse, Page } from '../models';
import { Observable } from 'rxjs';
import { HttpClient, HttpEvent } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  constructor(private readonly http: HttpClient) {}

  getAttachmentsForTask(taskId: number): Observable<Page<AttachmentResponse>> {
    return this.http.get<Page<AttachmentResponse>>(`/api/attachments/tasks/${taskId}`);
  }

  uploadFile(taskId: number, file: File) : Observable<HttpEvent<unknown>> {
    const formData = new FormData();

    formData.append('file', file);
    return this.http.post(`/api/attachments/tasks/${taskId}`, formData, {
      observe: 'events'
    });
  }

  downloadFile(attachmentId: number) : Observable<Blob> {
    return this.http.get(`/api/attachments/${attachmentId}`, { responseType: 'blob' });
  }

  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http.delete<void>(`/api/attachments/${attachmentId}`);
  }
}
