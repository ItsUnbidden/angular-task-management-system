import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LabelCreateRequest, LabelResponse, LabelUpdateRequest } from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LabelService {
  constructor(private readonly http: HttpClient) {};

  getLabelsForProject(projectId: number) : Observable<LabelResponse[]> {
    return this.http.get<LabelResponse[]>(`${environment.apiUrl}/api/labels/projects/${projectId}`);
  }

  getLabelById(labelId: number) : Observable<LabelResponse> {
    return this.http.get<LabelResponse>(`${environment.apiUrl}/api/labels/${labelId}`);
  }

  getLabelsForTask(taskId: number) : Observable<LabelResponse[]> {
    return this.http.get<LabelResponse[]>(`${environment.apiUrl}/api/labels/tasks/${taskId}`);
  }

  createLabel(request: LabelCreateRequest) : Observable<LabelResponse> {
    return this.http.post<LabelResponse>(`${environment.apiUrl}/api/labels`, request);
  }

  updateLabel(labelId: number, request: LabelUpdateRequest) : Observable<LabelResponse> {
    return this.http.put<LabelResponse>(`${environment.apiUrl}/api/labels/${labelId}`, request);
  }

  deleteLabel(labelId: number) : Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/labels/${labelId}`);
  }
}
