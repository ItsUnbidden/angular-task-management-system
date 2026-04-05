import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { GeneralApiError, Page, TaskCreateRequest, TaskFilter, TaskResponse, TaskUpdateRequest, TaskUpdateStatusRequest } from '../models';
import { Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  readonly tasks = signal<TaskResponse[]>([]);
  readonly selectedTask = signal<TaskResponse | null>(null);
  readonly isLoadingTasks = signal(false);
  readonly isLoadingSelectedTask = signal(false);
  readonly tasksLoadingError = signal<string | null>(null);
  readonly selectedTaskLoadingError = signal<string | null>(null);
  readonly totalTasks = signal(0);

  constructor(private http: HttpClient) { }

  cacheSelectedTask(taskId: number) : Observable<TaskResponse> {
    const tasks = this.tasks();
    const existing = tasks.find(t => t.id === taskId);
    
    if (existing) {
      this.selectedTask.set(existing);
      return of(existing);
    } else {
      this.isLoadingSelectedTask.set(true);
      this.selectedTaskLoadingError.set(null);
      return this.http.get<TaskResponse>(`${environment.apiUrl}/api/tasks/${taskId}`).pipe(tap({
        next: t => {
          this.selectedTask.set(t);
          this.isLoadingSelectedTask.set(false);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.selectedTaskLoadingError.set(error ? error.error : 'Unknown error occured while loading the selected task.');
        }
      }));
    }
  }

  updateCachedTask(request: TaskUpdateRequest | TaskUpdateStatusRequest) : Observable<TaskResponse> | null {
    const selectedTask = this.selectedTask();

    if (selectedTask) {
      const next = (t: TaskResponse) => {
        this.selectedTask.set(t);
        this.isLoadingSelectedTask.set(false);
      };
      const error = (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.selectedTaskLoadingError.set(error ? error.error : 'Unknown error occured while updating the selected task.');
        this.isLoadingSelectedTask.set(false);
      }

      this.isLoadingSelectedTask.set(true);
      this.selectedTaskLoadingError.set(null);
      if (this.isStatusUpdateRequest(request)) {
        return this.updateTaskStatus(selectedTask.id, request).pipe(tap({ next, error }));
      }
      return this.updateTask(selectedTask.id, request).pipe(tap({ next, error }));
    }
    return null;
  }

  cacheProjectTasksPage(projectId: number, filter: TaskFilter, page: number, size: number) : Observable<Page<TaskResponse>> {
    this.isLoadingTasks.set(true);
    this.tasksLoadingError.set(null);
    return this.getFilteredTasksInProject(projectId, filter, page, size).pipe(tap({
      next: res => {
        this.tasks.set(res.content);
        this.totalTasks.set(res.totalElements);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.tasksLoadingError.set(error ? error.error : 'Unknown error occured while loading the task page.')
      },
      finalize: () => {
        this.isLoadingTasks.set(false);
      }
    }));
  }

  getTasksForProject(projectId: number, page: number, size: number) : Observable<Page<TaskResponse>> {
    return this.http.get<Page<TaskResponse>>(`${environment.apiUrl}/api/tasks/projects/${projectId}?page=${page}&size=${size}`);
  }

  getMyTasks(name: string, page: number, size: number, sort: string, direction: string) : Observable<Page<TaskResponse>> {
    let params = new HttpParams().set('name', name).set('page', page).set('size', size);
    
    if (sort !== '' && direction !== '') params = params.set('sort', sort + ',' + direction);

    return this.http.get<Page<TaskResponse>>(`${environment.apiUrl}/api/tasks/me`, { params });
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
