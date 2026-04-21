import { Injectable, signal } from '@angular/core';
import { AttachmentResponse, Page } from '../models';
import { Observable } from 'rxjs';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  readonly attachments = signal<AttachmentResponse[]>([]);
  readonly isLoading = signal(false);

  constructor(private http: HttpClient) {}

  cacheAttachmentsForTask(taskId: number) {
    this.isLoading.set(true);
    this.getAttachmentsForTask(taskId).subscribe({
      next: page => {
        this.attachments.set(page.content);
        this.isLoading.set(false);
      }
    });
  }

  getAttachmentsForTask(taskId: number): Observable<Page<AttachmentResponse>> {
    return this.http.get<Page<AttachmentResponse>>(`${environment.apiUrl}/api/attachments/tasks/${taskId}`);
  }

  uploadFile(taskId: number, file: File) : Observable<HttpEvent<unknown>> {
    const formData = new FormData();

    formData.append('file', file);
    return this.http.post(`${environment.apiUrl}/api/attachments/tasks/${taskId}`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  downloadFile(attachmentId: number) : Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/api/attachments/${attachmentId}`, { responseType: 'blob' });
  }

  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/attachments/${attachmentId}`);
  }
}
