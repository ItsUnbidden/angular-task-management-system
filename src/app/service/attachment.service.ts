import { Injectable } from '@angular/core';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { AttachmentResponse } from '../models/attachment.model';
import { Page } from '../models/general.model';

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
    return this.http.get(`/api/attachments/${attachmentId}`, { responseType: 'blob' })
        .pipe(catchError((err: HttpErrorResponse) => {
      const errorBlob = err.error;

      if (errorBlob instanceof Blob && errorBlob.type.includes("application/json")) {
        return from(errorBlob.text()).pipe(switchMap(text => {
          const parsedError = JSON.parse(text);

          return throwError(() => parsedError);
        }))
      }
      return throwError(() => err);
    }));
  }

  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http.delete<void>(`/api/attachments/${attachmentId}`);
  }
}
