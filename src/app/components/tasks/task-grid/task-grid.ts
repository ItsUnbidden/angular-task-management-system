import { Component, computed, effect, inject, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EssentialUserResponse, Page, TaskPriority, TaskResponse, TaskStatus } from '../../../models';
import { MatDialog } from '@angular/material/dialog';
import { NewTaskDialog } from '../new-task-dialog/new-task-dialog';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from "@angular/material/icon";
import { getChipColor, getChipText, toLocalDateString } from '../../../utils';
import { EMPTY, map, Observable, switchMap } from 'rxjs';
import { ProjectStore } from '../../../cache/project.store';
import { TaskStore } from '../../../cache/task.store';
import { UserStore } from '../../../cache/user.store';
import { LabelStore } from '../../../cache/label.store';
import { toSignal } from '@angular/core/rxjs-interop';

interface TaskStatusOption {
  status: TaskStatus;
  statusView: string;
  class: string;
}

interface TaskPriorityOption {
  priority: TaskPriority;
  priorityView: string;
  class: string;
}

@Component({
  selector: 'app-task-grid',
  imports: [CommonModule, MatCardModule, MatDividerModule,
            MatProgressSpinnerModule, MatChipsModule, MatPaginatorModule,
            MatButtonModule, MatSelectModule, ReactiveFormsModule,
            MatDatepickerModule, MatNativeDateModule, MatIconModule],
  templateUrl: './task-grid.html',
  styleUrl: './task-grid.css',
})
export class TaskGrid {
  private static readonly DEFAULT_GRID_SIZE = 8;

  private readonly userStore = inject(UserStore);
  private readonly projectStore = inject(ProjectStore);
  private readonly taskStore = inject(TaskStore);
  private readonly labelStore = inject(LabelStore);

  private readonly route = inject(ActivatedRoute);
  
  protected readonly selectedProjectCache = this.projectStore.selectedProjectCache.asReadonly();
  protected readonly projectUsers = computed(() => {
    const project = this.selectedProjectCache().item;
    
    return (project) ? project.projectRoles.map<EssentialUserResponse>(pr => {
      return { id: pr.userId, username: pr.username };
    }) : null;
  });
  protected readonly tasks = this.taskStore.cache.asReadonly();
  protected readonly projectLabels = this.labelStore.cache.asReadonly();

  private readonly currentFilter = computed(() => {
    const filter = this.tasks().filter;

    if (filter && typeof filter !== 'string') {
      return filter;
    }
    return undefined;
  });

  protected readonly isAdmin = this.projectStore.isAdmin;
  protected readonly isManager = this.userStore.isManager;

  private readonly projectId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('projectId')))), { initialValue: 0 }
  );

  protected readonly statusOptions: TaskStatusOption[] = [
    { status: 'NOT_STARTED', statusView: 'Not started', class: 'status-initiated' },
    { status: 'IN_PROGRESS', statusView: 'In progress', class: 'status-in-progress' },
    { status: 'COMPLETED', statusView: 'Completed', class: 'status-completed' },
    { status: 'OVERDUE', statusView: 'Overdue', class: 'status-overdue' }
  ]

  protected readonly priorityOptions: TaskPriorityOption[] = [
    { priority: 'LOW', priorityView: 'Low', class: 'priority-low' },
    { priority: 'MEDIUM', priorityView: 'Medium', class: 'priority-medium' },
    { priority: 'HIGH', priorityView: 'High', class: 'priority-high' }
  ]

  protected readonly filterForm = new FormGroup({
    assigneeId: new FormControl<number | null>(this.currentFilter()?.assigneeId ?? null),
    status: new FormControl<TaskStatus | null>(this.currentFilter()?.status ?? null),
    priority: new FormControl<TaskPriority | null>(this.currentFilter()?.priority ?? null),
    dueDateFrom: new FormControl<Date | null>(this.getDate(this.currentFilter()?.dueDateFrom)),
    dueDateTo: new FormControl<Date | null>(this.getDate(this.currentFilter()?.dueDateTo)),
    labelIds: new FormControl<number[]>(this.currentFilter()?.labelIds ?? [])
  });

  constructor(private readonly dialog: MatDialog,
              private readonly router: Router) {
    effect(() => {
      const projectId = this.projectId();

      if (projectId) {
        untracked(() => {
          this.taskStore.cacheProjectTasks(projectId, this.taskStore.currentProjectId === projectId ? this.tasks().pageIndex : 0, TaskGrid.DEFAULT_GRID_SIZE).subscribe();
          this.labelStore.cacheLabelsForProject(projectId).subscribe();
        });
      }
    });

    effect(() => {
      const tasks = this.tasks();

      untracked(() => {
        if (tasks.isLoading) {
          this.filterForm.disable({ emitEvent: false });
        } else {
          this.filterForm.enable({ emitEvent: false });
        }
      });
    });
    const projectId = this.projectId();

    if (projectId) {
      this.filterForm.valueChanges.pipe(
        switchMap(() => this.taskStore.cacheProjectTasks(projectId, 0, this.tasks().pageSize, {
          assigneeId: this.filterForm.value.assigneeId ?? undefined,
          status: this.filterForm.value.status ?? undefined,
          priority: this.filterForm.value.priority ?? undefined,
          dueDateFrom: toLocalDateString(this.filterForm.value.dueDateFrom ?? null),
          dueDateTo: toLocalDateString(this.filterForm.value.dueDateTo ?? null),
          labelIds: this.filterForm.value.labelIds ?? undefined
        }))
      ).subscribe();
    }
  }

  protected onTaskPage(event: PageEvent) {
    const project = this.selectedProjectCache()?.item;

    if (project) this.taskStore.cacheProjectTasks(project.id, event.pageIndex, event.pageSize).subscribe();
  }

  protected onCreateNewTask() {
    const project = this.selectedProjectCache()?.item;

    if (project) {
      this.dialog.open(NewTaskDialog, {
        data: {
          projectId: project.id,
          projectMembers: project.projectRoles.map(pr => {
            return { id: pr.userId, username: pr.username };
          })
        },
        disableClose: true,
        width: '500px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.cacheProjectTasks();
        return EMPTY;
      })).subscribe();
    }
  }

  protected onOpenTask(task: TaskResponse) {
    this.router.navigateByUrl(`/projects/${task.projectId}/tasks/${task.id}`);
  }
  
  protected onClearFilters() {
    this.filterForm.patchValue({
      assigneeId: null,
      status: null,
      priority: null,
      dueDateFrom: null,
      dueDateTo: null,
      labelIds: []
    });
    const project = this.selectedProjectCache()?.item;

    if (project) this.taskStore.cacheProjectTasks(project.id, this.tasks().pageIndex, this.tasks().pageSize, {}).subscribe();
  }

  protected onTryAgain() {
    const project = this.selectedProjectCache()?.item;

    if (project) this.taskStore.cacheProjectTasks(project.id, 0, TaskGrid.DEFAULT_GRID_SIZE, {}).subscribe();
  }

  protected cacheProjectTasks() : Observable<Page<TaskResponse>> {
    const project = this.selectedProjectCache().item;

    if (project) return this.taskStore.cacheProjectTasks(project.id);
    return EMPTY;
  }

  protected getChipColorLocal(status: string | null): string {
    return getChipColor(status);
  }

  protected getChipTextLocal(status: string | null): string {
    return getChipText(status);
  }

  private getDate(value?: string) : Date | null {
    return value ? new Date(value) : null;
  }
}
