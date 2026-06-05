import { computed, inject, Injectable } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { catchError, Observable, of, tap } from 'rxjs';
import { LabelService } from '../service/label.service';
import { TaskStore } from './task.store';
import { LabelResponse } from '../models/label.model';
import { Page } from '../models/general.model';

@Injectable({
  providedIn: 'root'
})
export class LabelStore extends AbstractStore<LabelResponse, never> {
  private readonly taskStore = inject(TaskStore);

  readonly selectedTaskLabels = computed(() => {
    const task = this.taskStore.selectedTaskCache().item;

    return task ? this.cache().page?.content?.filter(l => l.taskIds.includes(task.id)) ?? [] : [];
  });

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
}
