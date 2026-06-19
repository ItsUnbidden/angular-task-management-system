import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SubtaskResponse, SubtaskCreateRequest, SubtaskUpdateRequest } from '../models/subtask.model';
import { Page } from '../models/general.model';
import { getPageableParams } from '../utils';

@Injectable({
  providedIn: 'root',
})
export class SubtaskService {
  constructor(private http: HttpClient) {}

  getSubtasksByTaskId(taskId: number, page: number, size: number) : Observable<Page<SubtaskResponse>> {
    return this.http.get<Page<SubtaskResponse>>(`/api/subtasks/task/${taskId}`, { params: getPageableParams(page, size) });
  }

  createSubtask(request: SubtaskCreateRequest) : Observable<SubtaskResponse> {
    return this.http.post<SubtaskResponse>('/api/subtasks', request);
  }

  updateSubtask(id: number, request: SubtaskUpdateRequest) : Observable<SubtaskResponse> {
    return this.http.put<SubtaskResponse>(`/api/subtasks/${id}`, request);
  }

  deleteSubtask(id: number) : Observable<void> {
    return this.http.delete<void>(`/api/subtasks/${id}`);
  }
}
