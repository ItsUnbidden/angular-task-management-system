import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Page, TaskCreateRequest, TaskDeleteResponse, TaskFilter, TaskResponse, TaskUpdateRequest, TaskUpdateStatusRequest } from '../models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  constructor(private readonly http: HttpClient) { }

  getTaskById(taskId: number) : Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`/api/tasks/${taskId}`);
  }

  getTasksForProject(projectId: number, page: number, size: number) : Observable<Page<TaskResponse>> {
    return this.http.get<Page<TaskResponse>>(`/api/tasks/projects/${projectId}?page=${page}&size=${size}`);
  }

  getMyTasks(name: string, page: number, size: number, sort: string, direction: string) : Observable<Page<TaskResponse>> {
    let params = new HttpParams().set('name', name).set('page', page).set('size', size);
    
    if (sort !== '' && direction !== '') params = params.set('sort', sort + ',' + direction);

    return this.http.get<Page<TaskResponse>>(`/api/tasks/me`, { params });
  }

  getTasksByLabel(labelId: number) : Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(`/api/tasks/labels/${labelId}`);
  }
  
  getFilteredTasksInProject(projectId: number, filter: TaskFilter, page: number, size: number) : Observable<Page<TaskResponse>> {
    let params = new HttpParams();

    if (filter.assigneeId)
      params = params.set('assigneeId', filter.assigneeId);
    if (filter.priority)
      params = params.set('priority', filter.priority);
    if (filter.status)
      params = params.set('status', filter.status);
    if (filter.dueDateFrom)
      params = params.set('dueDateFrom', filter.dueDateFrom)
    if (filter.dueDateTo)
      params = params.set('dueDateTo', filter.dueDateTo)
    if (filter.labelIds && filter.labelIds.length !== 0)
      params = params.set('labelIds', filter.labelIds.join());
      
    params = params
      .set('size', size)
      .set('page', page);
    return this.http.get<Page<TaskResponse>>(`/api/tasks/projects/${projectId}/filter`, { params });
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
