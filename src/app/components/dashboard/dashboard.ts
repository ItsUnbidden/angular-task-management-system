import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs'
import { ProjectService } from '../../service/project.service';
import { TaskService } from '../../service/task.service';
import { GeneralApiError, Page, ProjectResponse, TaskResponse } from '../../models';
import { MatDialog } from '@angular/material/dialog';
import { NewProjectDialog } from '../projects/new-project/new-project-dialog';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { debounceTime, distinctUntilChanged, EMPTY, Observable, switchMap, tap } from 'rxjs';
import { getChipColor, getChipText } from '../../utils';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { UserService } from '../../service/user.service';

interface TableState {
  pageIndex: number;
  pageSize: number;
  sortActive: string;
  sortDirection: 'asc' | 'desc' | '';
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatCardModule, MatTabsModule, MatTableModule,
    MatButtonModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, MatChipsModule, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly userService = inject(UserService);

  readonly isLoadingMyProjects = signal(false);
  readonly isLoadingTasks = signal(false);
  readonly isLoadingPublicProjects = signal(false);

  readonly myProjectsError = signal<string | null>(null);
  readonly myTasksError = signal<string | null>(null);
  readonly publicProjectsError = signal<string | null>(null);
  
  readonly myProjectsTableState = signal<TableState>({ pageIndex: 0, pageSize: 10, sortActive: 'name', sortDirection: 'asc' });
  readonly myTasksTableState = signal<TableState>({ pageIndex: 0, pageSize: 10, sortActive: 'name', sortDirection: 'asc' });
  readonly publicProjectsTableState = signal<TableState>({ pageIndex: 0, pageSize: 25, sortActive: 'name', sortDirection: 'asc' });

  readonly myProjectTotalElements = signal(0);
  readonly myTasksTotalElements = signal(0);
  readonly publicProjectTotalElements = signal(0);

  readonly isManager = this.userService.isManager;

  readonly projectColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'creator', 'isPrivate'];
  readonly publicProjectColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'creator'];
  readonly taskColumns: string[] = ['name', 'priority', 'status', 'dueDate', 'assignee.username'];

  readonly myProjectsDS = new MatTableDataSource<ProjectResponse>([]);
  readonly myTasksDS = new MatTableDataSource<TaskResponse>([]);
  readonly publicProjectsDS = new MatTableDataSource<ProjectResponse>([]);

  readonly myProjectsFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  readonly myTasksFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  readonly publicProjectsFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  private readonly myProjectsLoadingErrorAction = (err: HttpErrorResponse) => {
    const error = err.error as GeneralApiError;
    
    this.myProjectsError.set(error ? error.errors[0] : 'An unknown error occured while loading my projects.');
    this.isLoadingMyProjects.set(false);
  };

  private readonly myTasksLoadingErrorAction = (err: HttpErrorResponse) => {
    const error = err.error as GeneralApiError;
    
    this.myTasksError.set(error ? error.errors[0] : 'An unknown error occured while loading my tasks.');
    this.isLoadingTasks.set(false);
  };

  private readonly publicProjectsLoadingErrorAction = (err: HttpErrorResponse) => {
    const error = err.error as GeneralApiError;

    this.publicProjectsError.set(error ? error.errors[0] : 'An unknown error occured while loading public projects.');
    this.isLoadingPublicProjects.set(false);
  };
  
  constructor(public readonly projectService: ProjectService,
              private readonly taskService: TaskService,
              private readonly dialog: MatDialog,
              private readonly router: Router) {
    effect(() => {
      this.myProjectsTableState();
      this.loadMyProjects().subscribe({
        error: this.myProjectsLoadingErrorAction
      });
    });

    effect(() => {
      this.myTasksTableState();
      this.loadMyTasks().subscribe({
        error: this.myTasksLoadingErrorAction
      });
    });

    effect(() => {
      this.publicProjectsTableState();
      this.loadPublicProjects().subscribe({
        error: this.publicProjectsLoadingErrorAction
      });
    });
    
    this.myProjectsFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(() => {
        const state = this.myProjectsTableState();

        if (state.pageIndex === 0) {
          return this.loadMyProjects();
        } else {
          this.myProjectsTableState.update(state => {
            return { ...state, pageIndex: 0 };
          });
        }
        return EMPTY;
      })
    ).subscribe({
      error: this.myProjectsLoadingErrorAction
    });
    
    this.myTasksFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(() => {
        const state = this.myTasksTableState();

        if (state.pageIndex === 0) {
          return this.loadMyTasks();
        } else {
          this.myTasksTableState.update(state => {
            return { ...state, pageIndex: 0 };
          });
        }
        return EMPTY;
      })
    ).subscribe({
      error: this.myTasksLoadingErrorAction
    });
    
    this.publicProjectsFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(() => {
        const state = this.publicProjectsTableState();

        if (state.pageIndex === 0) {
          return this.loadPublicProjects();
        } else {
          this.publicProjectsTableState.update(state => {
            return { ...state, pageIndex: 0 };
          });
        }
        return EMPTY;
      })
    ).subscribe({
      error: this.publicProjectsLoadingErrorAction
    });
  }

  ngAfterViewInit() {
    this.loadMyProjects();
    this.loadMyTasks();
    this.loadPublicProjects();
  }

  onOpenNewProjectDialog() {
    const ref = this.dialog.open(NewProjectDialog, {
      width: '420px',
      disableClose: true
    });

    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.loadMyProjects();
      }
    });
  }

  onSelectProject(p: ProjectResponse) {
    this.router.navigateByUrl(`/projects/${p.id}`);
  }

  onSelectTask(t: TaskResponse) {
    this.router.navigateByUrl(`/projects/${t.projectId}/tasks/${t.id}`);
  }

  onMyProjectsPage(event: PageEvent) {
    this.myProjectsTableState.update(state => {
      return { ...state, pageIndex: event.pageIndex, pageSize: event.pageSize };
    });
  }

  onMyTasksPage(event: PageEvent) {
    this.myTasksTableState.update(state => {
      return { ...state, pageIndex: event.pageIndex, pageSize: event.pageSize };
    });
  }

  onPublicProjectsPage(event: PageEvent) {
    this.publicProjectsTableState.update(state => {
      return { ...state, pageIndex: event.pageIndex, pageSize: event.pageSize };
    });
  }

  onMyProjectsSort(event: Sort) {
    this.myProjectsTableState.update(state => {
      return { ...state, pageIndex: 0, sortActive: event.direction !== '' ? event.active : 'name', sortDirection: event.direction !== '' ? event.direction : 'asc' };
    })
  }

  onMyTasksSort(event: Sort) {
    console.log(`Active: ${event.active}, direction: ${event.direction}`);
    this.myTasksTableState.update(state => {
      return { ...state, pageIndex: 0, sortActive: event.direction !== '' ? event.active : 'name', sortDirection: event.direction !== '' ? event.direction : 'asc' };
    })
  }

  onPublicProjectsSort(event: Sort) {
    this.publicProjectsTableState.update(state => {
      return { ...state, pageIndex: 0, sortActive: event.direction !== '' ? event.active : 'name', sortDirection: event.direction !== '' ? event.direction : 'asc' };
    })
  }

  getChipColorLocal(value: string | null): string {
    return getChipColor(value);
  }

  getChipTextLocal(value: string | null): string {
    return getChipText(value);
  }
  
  private loadMyProjects() : Observable<Page<ProjectResponse>> {
    this.isLoadingMyProjects.set(true);
    this.myProjectsError.set(null);

    const state = this.myProjectsTableState();

    return this.projectService.getMyProjects(this.myProjectsFilterForm.value.filter?.trim() ?? '',
      state.pageIndex,
      state.pageSize,
      state.sortActive,
      state.sortDirection).pipe(tap({
        next: (page: Page<ProjectResponse>) => {
          this.myProjectsDS.data = page.content;
          this.myProjectTotalElements.set(page.totalElements);
          this.isLoadingMyProjects.set(false);
        }
      })
    );
  }

  private loadMyTasks() : Observable<Page<TaskResponse>> {
    this.isLoadingTasks.set(true);
    this.myTasksError.set(null);

    const state = this.myTasksTableState();

    return this.taskService.getMyTasks(this.myTasksFilterForm.value.filter?.trim() ?? '',
      state.pageIndex,
      state.pageSize,
      state.sortActive,
      state.sortDirection).pipe(tap({
        next: (page: Page<TaskResponse>) => {
          this.myTasksDS.data = page.content;
          this.myTasksTotalElements.set(page.totalElements);
          this.isLoadingTasks.set(false);
        }
      })
    );
  }

  private loadPublicProjects() : Observable<Page<ProjectResponse>> {
    this.isLoadingPublicProjects.set(true);
    this.publicProjectsError.set(null);

    const state = this.publicProjectsTableState();

    return this.projectService.searchProjectsByName(this.publicProjectsFilterForm.value.filter?.trim() ?? '',
      state.pageIndex,
      state.pageSize,
      state.sortActive,
      state.sortDirection).pipe(tap({
        next: (page: Page<ProjectResponse>) => {
          this.publicProjectsDS.data = page.content;
          this.publicProjectTotalElements.set(page.totalElements);
          this.isLoadingPublicProjects.set(false);
        }
      })
    );
  }
}
