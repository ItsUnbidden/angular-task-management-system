import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LabelCreateRequest, LabelResponse, LabelUpdateRequest } from '../models/label.model';
import { Page } from '../models/general.model';

@Injectable({
  providedIn: 'root',
})
export class LabelService {
  constructor(private readonly http: HttpClient) {};

  getLabelsForProject(projectId: number) : Observable<Page<LabelResponse>> {
    return this.http.get<Page<LabelResponse>>(`/api/labels/projects/${projectId}`);
  }

  getLabelById(labelId: number) : Observable<LabelResponse> {
    return this.http.get<LabelResponse>(`/api/labels/${labelId}`);
  }

  getLabelsForTask(taskId: number) : Observable<Page<LabelResponse>> {
    return this.http.get<Page<LabelResponse>>(`/api/labels/tasks/${taskId}`);
  }

  createLabel(request: LabelCreateRequest) : Observable<LabelResponse> {
    return this.http.post<LabelResponse>(`/api/labels`, request);
  }

  updateLabel(labelId: number, request: LabelUpdateRequest) : Observable<LabelResponse> {
    return this.http.put<LabelResponse>(`/api/labels/${labelId}`, request);
  }

  deleteLabel(labelId: number) : Observable<void> {
    return this.http.delete<void>(`/api/labels/${labelId}`);
  }
}
