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
import { GeneralApiError, ProjectResponse, TaskResponse } from '../../models';
import { MatDialog } from '@angular/material/dialog';
import { NewProjectDialog } from '../projects/new-project/new-project-dialog';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { debounceTime, distinctUntilChanged } from 'rxjs';
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
  private userService = inject(UserService);

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

  projectColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'creator', 'isPrivate'];
  publicProjectColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'creator'];
  taskColumns: string[] = ['name', 'priority', 'status', 'dueDate', 'assignee.username'];

  myProjectsDS = new MatTableDataSource<ProjectResponse>([]);
  myTasksDS = new MatTableDataSource<TaskResponse>([]);
  publicProjectsDS = new MatTableDataSource<ProjectResponse>([]);

  myProjectsFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  myTasksFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  publicProjectsFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  constructor(public projectService: ProjectService,
              private taskService: TaskService,
              private dialog: MatDialog,
              private router: Router) {
    effect(() => {
      this.myProjectsTableState();
      this.loadMyProjects();
    });

    effect(() => {
      this.myTasksTableState();
      this.loadMyTasks();
    });

    effect(() => {
      this.publicProjectsTableState();
      this.loadPublicProjects();
    });
    
    this.myProjectsFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      const state = this.myProjectsTableState();

      if (state.pageIndex === 0) {
        this.loadMyProjects();
      } else {
        this.myProjectsTableState.update(state => {
          return { ...state, pageIndex: 0 };
        });
      }
    });
    
    this.myTasksFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      const state = this.myTasksTableState();

      if (state.pageIndex === 0) {
        this.loadMyTasks();
      } else {
        this.myTasksTableState.update(state => {
          state.pageIndex = 0;
          return state;
        });
      }
    });
    
    this.publicProjectsFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      const state = this.publicProjectsTableState();

      if (state.pageIndex === 0) {
        this.loadPublicProjects();
      } else {
        this.publicProjectsTableState.update(state => {
          state.pageIndex = 0;
          return state;
        });
      }
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
  
  private loadMyProjects() {
    this.isLoadingMyProjects.set(true);
    this.myProjectsError.set(null);

    const state = this.myProjectsTableState();

    this.projectService.getMyProjects(this.myProjectsFilterForm.value.filter?.trim() ?? '',
      state.pageIndex,
      state.pageSize,
      state.sortActive,
      state.sortDirection)
    .subscribe({
      next: page => {
        this.myProjectsDS.data = page.content;
        this.myProjectTotalElements.set(page.totalElements);
        this.isLoadingMyProjects.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;
        
        this.myProjectsError.set(error ? error.error : 'An unknown error occured while loading my projects.');
        this.isLoadingMyProjects.set(false);
      }
    });
  }

  private loadMyTasks() {
    this.isLoadingTasks.set(true);
    this.myTasksError.set(null);

    const state = this.myTasksTableState();

    this.taskService.getMyTasks(this.myTasksFilterForm.value.filter?.trim() ?? '',
      state.pageIndex,
      state.pageSize,
      state.sortActive,
      state.sortDirection)
    .subscribe({
      next: page => {
        this.myTasksDS.data = page.content;
        this.myTasksTotalElements.set(page.totalElements);
        this.isLoadingTasks.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;
        
        this.myTasksError.set(error ? error.error : 'An unknown error occured while loading my tasks.');
        this.isLoadingTasks.set(false);
      }
    });
  }

  private loadPublicProjects() {
    this.isLoadingPublicProjects.set(true);
    this.publicProjectsError.set(null);

    const state = this.publicProjectsTableState();

    this.projectService.searchProjectsByName(this.publicProjectsFilterForm.value.filter?.trim() ?? '',
      state.pageIndex,
      state.pageSize,
      state.sortActive,
      state.sortDirection)
    .subscribe({
      next: page => {
        this.publicProjectsDS.data = page.content;
        this.publicProjectTotalElements.set(page.totalElements);
        this.isLoadingPublicProjects.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.publicProjectsError.set(error ? error.error : 'An unknown error occured while loading public projects.');
        this.isLoadingPublicProjects.set(false);
      }
    });
  }
}
