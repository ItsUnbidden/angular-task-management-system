import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs'
import { ProjectService } from '../../service/project.service';
import { EssentialUserResponse, ProjectResponse, TaskResponse } from '../../models';
import { MatDialog } from '@angular/material/dialog';
import { NewProjectDialog } from '../projects/new-project/new-project-dialog';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { debounceTime, distinctUntilChanged, EMPTY, switchMap } from 'rxjs';
import { getChipColor, getChipText, getProjectCreator } from '../../utils';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { DashboardStore } from '../../cache/dashboard.store';
import { UserStore } from '../../cache/user.store';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatCardModule, MatTabsModule, MatTableModule,
    MatButtonModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, MatChipsModule, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  private readonly userStore = inject(UserStore);
  private readonly dashboardStore = inject(DashboardStore);

  readonly projectsCache = this.dashboardStore.projectsCache.asReadonly();
  readonly myTasksCache = this.dashboardStore.myTasksCache.asReadonly();

  readonly currentTab = signal<number>(0);

  readonly isManager = this.userStore.isManager;

  readonly projectColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'creator', 'isPrivate'];
  readonly publicProjectColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'creator'];
  readonly taskColumns: string[] = ['name', 'priority', 'status', 'dueDate', 'assignee.username'];

  readonly myProjectsFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  readonly myTasksFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  readonly publicProjectsFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });
  
  constructor(public readonly projectService: ProjectService,
              private readonly dialog: MatDialog,
              private readonly router: Router) {
    effect(() => {
      const currentTab = this.currentTab();

      if (currentTab === 0) {
        this.cacheMyProjectsDefault();
      }
      if (currentTab === 1) {
        this.dashboardStore.cachePublicProjects(this.publicProjectsFilterForm.value.filter ?? '', {
          pageIndex: 0,
          pageSize: 50,
          sortActive: '',
          sortDirection: ''
        }).subscribe();
      }
    });

    this.myProjectsFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(() => {
        const cache = this.projectsCache();

        return this.dashboardStore.cacheMyProjects(this.myProjectsFilterForm.value.filter ?? '', {
          pageIndex: cache.pageIndex === 0 ? cache.pageIndex : 0,
          pageSize: cache.pageSize,
          sortActive: cache.sort,
          sortDirection: cache.direction
        });
      })
    ).subscribe();
    
    this.myTasksFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(() => {
        const cache = this.myTasksCache();

        return this.dashboardStore.cacheMyTasks(this.myTasksFilterForm.value.filter ?? '', {
          pageIndex: cache.pageIndex === 0 ? cache.pageIndex : 0,
          pageSize: cache.pageSize,
          sortActive: cache.sort,
          sortDirection: cache.direction
        });
      })
    ).subscribe();
    
    this.publicProjectsFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(() => {
        const cache = this.projectsCache();

        return this.dashboardStore.cachePublicProjects(this.publicProjectsFilterForm.value.filter ?? '', {
          pageIndex: cache.pageIndex === 0 ? cache.pageIndex : 0,
          pageSize: cache.pageSize,
          sortActive: cache.sort,
          sortDirection: cache.direction
        });
      })
    ).subscribe();
  }

  ngAfterViewInit() {
    this.dashboardStore.cacheMyTasks(this.myTasksFilterForm.value.filter ?? '', {
      pageIndex: 0,
      pageSize: 10,
      sortActive: '',
      sortDirection: ''
    }).subscribe();
  }

  onOpenNewProjectDialog() {
    const ref = this.dialog.open(NewProjectDialog, {
      width: '500px',
      disableClose: true
    });

    ref.afterClosed().pipe(switchMap(confirmed => {
      if (confirmed) {
        const cache = this.projectsCache();
        const state = {
          pageIndex: cache.pageIndex,
          pageSize: cache.pageSize,
          sortActive: cache.sort,
          sortDirection: cache.direction
        };

        return this.currentTab() === 0
          ? this.dashboardStore.cacheMyProjects(this.myProjectsFilterForm.value.filter ?? '', state)
          : this.dashboardStore.cachePublicProjects(this.publicProjectsFilterForm.value.filter ?? '', state);
      }
      return EMPTY;
    })).subscribe();
  }

  onSelectProject(p: ProjectResponse) {
    this.router.navigateByUrl(`/projects/${p.id}`);
  }

  onSelectTask(t: TaskResponse) {
    this.router.navigateByUrl(`/projects/${t.projectId}/tasks/${t.id}`);
  }

  onMyProjectsPage(event: PageEvent) {
    const cache = this.projectsCache();
    const state = {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      sortActive: cache.sort,
      sortDirection: cache.direction
    };

    this.dashboardStore.cacheMyProjects(this.myProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  onMyTasksPage(event: PageEvent) {
    const cache = this.myTasksCache();
    const state = {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      sortActive: cache.sort,
      sortDirection: cache.direction
    };

    this.dashboardStore.cacheMyTasks(this.myTasksFilterForm.value.filter ?? '', state).subscribe();
  }

  onPublicProjectsPage(event: PageEvent) {
    const cache = this.projectsCache();
    const state = {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      sortActive: cache.sort,
      sortDirection: cache.direction
    };

    this.dashboardStore.cachePublicProjects(this.publicProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  onMyProjectsSort(event: Sort) {
    const cache = this.projectsCache();
    const state = {
      pageIndex: 0,
      pageSize: cache.pageSize,
      sortActive: event.direction !== '' ? event.active : 'name',
      sortDirection: event.direction !== '' ? event.direction : 'asc'
    };

    this.dashboardStore.cacheMyProjects(this.myProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  onMyTasksSort(event: Sort) {
    const cache = this.myTasksCache();
    const state = {
      pageIndex: 0,
      pageSize: cache.pageSize,
      sortActive: event.direction !== '' ? event.active : 'name',
      sortDirection: event.direction !== '' ? event.direction : 'asc'
    };

    this.dashboardStore.cacheMyTasks(this.myProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  onPublicProjectsSort(event: Sort) {
    const cache = this.projectsCache();
    const state = {
      pageIndex: 0,
      pageSize: cache.pageSize,
      sortActive: event.direction !== '' ? event.active : 'name',
      sortDirection: event.direction !== '' ? event.direction : 'asc'
    };

    this.dashboardStore.cachePublicProjects(this.publicProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  onTabChange(event: MatTabChangeEvent) {
    this.currentTab.set(event.index);
  }

  getChipColorLocal(value: string | null): string {
    return getChipColor(value);
  }

  getChipTextLocal(value: string | null): string {
    return getChipText(value);
  }

  getProjectCreatorLocal(project: ProjectResponse) : EssentialUserResponse {
    return getProjectCreator(project);
  }

  private cacheMyProjectsDefault() {
    this.dashboardStore.cacheMyProjects(this.myProjectsFilterForm.value.filter ?? '', {
      pageIndex: 0,
      pageSize: 10,
      sortActive: '',
      sortDirection: ''
    }).subscribe();
  }
}
