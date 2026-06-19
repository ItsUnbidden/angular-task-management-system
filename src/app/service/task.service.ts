import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TaskCreateRequest, TaskDeleteResponse, TaskFilter, TaskResponse, TaskUpdateRequest, TaskUpdateStatusRequest } from '../models/task.model';
import { Page } from '../models/general.model';
import { getPageableParams } from '../utils';
import { SortDirection } from '@angular/material/sort';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  constructor(private readonly http: HttpClient) { }

  getTaskById(taskId: number) : Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`/api/tasks/${taskId}`);
  }

  getTasksForProject(projectId: number, page: number, size: number) : Observable<Page<TaskResponse>> {
    return this.http.get<Page<TaskResponse>>(`/api/tasks/projects/${projectId}`, { params: getPageableParams(page, size) });
  }

  getMyTasks(name: string, page: number, size: number, sort: string, direction: SortDirection) : Observable<Page<TaskResponse>> {
    return this.http.get<Page<TaskResponse>>(`/api/tasks/me`, { params: getPageableParams(page, size, sort, direction, { name }) });
  }

  getTasksByLabel(labelId: number) : Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(`/api/tasks/labels/${labelId}`);
  }
  
  getFilteredTasksInProject(projectId: number, filter: TaskFilter, page: number, size: number) : Observable<Page<TaskResponse>> {
    return this.http.get<Page<TaskResponse>>(`/api/tasks/projects/${projectId}/filter`, { params: getPageableParams(page, size, undefined, undefined, filter) });
  }

  createTask(request: TaskCreateRequest) : Observable<TaskResponse> {
    return this.http.post<TaskResponse>(`/api/tasks`, request);
  }

  updateTask(taskId: number, request: TaskUpdateRequest) : Observable<TaskResponse> {
    return this.http.put<TaskResponse>(`/api/tasks/${taskId}`, request);
  }

  updateTaskStatus(taskId: number, request: TaskUpdateStatusRequest) : Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`/api/tasks/${taskId}/status`, request);
  }

  deleteTask(taskId: number) : Observable<TaskDeleteResponse> {
    return this.http.delete<TaskDeleteResponse>(`/api/tasks/${taskId}`);
  }
}
