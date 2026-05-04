import { Injectable, signal } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { LabelResponse, Page } from '../models';
import { catchError, Observable, of, tap } from 'rxjs';
import { LabelService } from '../service/label.service';

@Injectable({
  providedIn: 'root'
})
export class LabelStore extends AbstractStore<LabelResponse, never> {
  private projectId = 0;

  constructor(private readonly labelService: LabelService) { super() };
  
  cacheLabelsForProject(projectId: number, forceReload?: boolean) : Observable<Page<LabelResponse>> {
    const currentCache = this.cache();

    if (!forceReload && currentCache.page && this.projectId === projectId) return of(currentCache.page);

    this.preLoading(0, -1);
    return this.labelService.getLabelsForProject(projectId).pipe(
      tap({
        next: page => {
          this.postLoading(page);
          this.projectId = projectId;
        }
      }),
      catchError(this.catchErrorDefault)
    );
  }

  getLabelsForTask(taskId: number) : LabelResponse[] {
    return this.cache().page?.content?.filter(l => l.taskIds.includes(taskId)) ?? [];
  }
}
