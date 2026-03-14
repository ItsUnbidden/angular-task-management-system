import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Page, TaskCreateRequest, TaskFilter, TaskResponse, TaskUpdateRequest, TaskUpdateStatusRequest } from '../models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  tasks = signal<TaskResponse[]>([]);
  selectedTask = signal<TaskResponse | null>(null);
  isLoadingTasks = signal(false);
  isLoadingSelectedTask = signal(false);
  totalTasks = signal(0);

  constructor(private http: HttpClient) { }

  cacheSelectedTask(taskId: number) {
    const tasks = this.tasks();
    const existing = tasks.find(t => t.id === taskId);
    
    if (existing) {
      this.selectedTask.set(existing);
    } else {
      this.isLoadingSelectedTask.set(true);
      this.http.get<TaskResponse>(`${environment.apiUrl}/api/tasks/${taskId}`).subscribe(t => {
        this.selectedTask.set(t);
        this.isLoadingSelectedTask.set(false);
      });
    }
  }

  updateCachedTask(request: TaskUpdateRequest | TaskUpdateStatusRequest) {
    const selectedTask = this.selectedTask();

    if (selectedTask) {
      const success = (t: TaskResponse) => {
        this.selectedTask.set(t);
        this.isLoadingSelectedTask.set(false);
      };

      this.isLoadingSelectedTask.set(true);
      if (this.isStatusUpdateRequest(request)) {
        this.updateTaskStatus(selectedTask.id, request).subscribe(success)
        return;
      }
      this.updateTask(selectedTask.id, request).subscribe(success)
    }
  }

  cacheProjectTasksPage(projectId: number, filter: TaskFilter, page: number, size: number) {
    this.isLoadingTasks.set(true);
    this.getFilteredTasksInProject(projectId, filter, page, size).subscribe(res => {
      this.tasks.set(res.content);
      this.totalTasks.set(res.totalElements);
      this.isLoadingTasks.set(false);
    })
  }

  getTasksForProject(projectId: number, page: number, size: number) : Observable<Page<TaskResponse>> {
    return this.http.get<Page<TaskResponse>>(`${environment.apiUrl}/api/tasks/projects/${projectId}?page=${page}&size=${size}`);
  }

  getMyTasks() : Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(`${environment.apiUrl}/api/tasks/me`);
  }

  getTasksByLabel(labelId: number) : Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(`${environment.apiUrl}/api/tasks/labels/${labelId}`);
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
    return this.http.get<Page<TaskResponse>>(`${environment.apiUrl}/api/tasks/projects/${projectId}/filter`, { params });
  }

  createTask(request: TaskCreateRequest) : Observable<TaskResponse> {
    return this.http.post<TaskResponse>(`${environment.apiUrl}/api/tasks`, request);
  }

  updateTask(taskId: number, request: TaskUpdateRequest) : Observable<TaskResponse> {
    return this.http.put<TaskResponse>(`${environment.apiUrl}/api/tasks/${taskId}`, request);
  }

  updateTaskStatus(taskId: number, request: TaskUpdateStatusRequest) : Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${environment.apiUrl}/api/tasks/${taskId}/status`, request);
  }

  private isStatusUpdateRequest(request: TaskUpdateRequest | TaskUpdateStatusRequest) : request is TaskUpdateStatusRequest {
    return 'newStatus' in request;
  }
}
