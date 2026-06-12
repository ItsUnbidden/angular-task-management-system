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
import { MatDialog } from '@angular/material/dialog';
import { NewProjectDialog } from '../projects/new-project/new-project-dialog';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { debounceTime, distinctUntilChanged, EMPTY, switchMap } from 'rxjs';
import { getChipColor, getChipTextKey, getProjectCreator } from '../../utils';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { DashboardStore } from '../../cache/dashboard.store';
import { UserStore } from '../../cache/user.store';
import { ProjectResponse } from '../../models/project.model';
import { TaskResponse } from '../../models/task.model';
import { EssentialUserResponse } from '../../models/user.model';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatCardModule, MatTabsModule, MatTableModule,
    MatButtonModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, MatChipsModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  private readonly userStore = inject(UserStore);
  private readonly dashboardStore = inject(DashboardStore);

  protected readonly projectsCache = this.dashboardStore.projectsCache;
  protected readonly myTasksCache = this.dashboardStore.myTasksCache;

  protected readonly currentTab = signal<number>(0);

  protected readonly isManager = this.userStore.isManager;

  protected readonly projectColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'creator', 'isPrivate'];
  protected readonly publicProjectColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'creator'];
  protected readonly taskColumns: string[] = ['name', 'priority', 'status', 'dueDate'];

  protected readonly myProjectsFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  protected readonly myTasksFilterForm = new FormGroup({
    filter: new FormControl<string>('')
  });

  protected readonly publicProjectsFilterForm = new FormGroup({
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

  protected ngAfterViewInit() {
    this.dashboardStore.cacheMyTasks(this.myTasksFilterForm.value.filter ?? '', {
      pageIndex: 0,
      pageSize: 10,
      sortActive: '',
      sortDirection: ''
    }).subscribe();
  }

  protected onOpenNewProjectDialog() {
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

  protected onSelectProject(p: ProjectResponse) {
    this.router.navigateByUrl(`/projects/${p.id}`);
  }

  protected onSelectTask(t: TaskResponse) {
    this.router.navigateByUrl(`/projects/${t.projectId}/tasks/${t.id}`);
  }

  protected onMyProjectsPage(event: PageEvent) {
    const cache = this.projectsCache();
    const state = {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      sortActive: cache.sort,
      sortDirection: cache.direction
    };

    this.dashboardStore.cacheMyProjects(this.myProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  protected onMyTasksPage(event: PageEvent) {
    const cache = this.myTasksCache();
    const state = {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      sortActive: cache.sort,
      sortDirection: cache.direction
    };

    this.dashboardStore.cacheMyTasks(this.myTasksFilterForm.value.filter ?? '', state).subscribe();
  }

  protected onPublicProjectsPage(event: PageEvent) {
    const cache = this.projectsCache();
    const state = {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      sortActive: cache.sort,
      sortDirection: cache.direction
    };

    this.dashboardStore.cachePublicProjects(this.publicProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  protected onMyProjectsSort(event: Sort) {
    const cache = this.projectsCache();
    const state = {
      pageIndex: 0,
      pageSize: cache.pageSize,
      sortActive: event.direction !== '' ? event.active : 'name',
      sortDirection: event.direction !== '' ? event.direction : 'asc'
    };

    this.dashboardStore.cacheMyProjects(this.myProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  protected onMyTasksSort(event: Sort) {
    const cache = this.myTasksCache();
    const state = {
      pageIndex: 0,
      pageSize: cache.pageSize,
      sortActive: event.direction !== '' ? event.active : 'name',
      sortDirection: event.direction !== '' ? event.direction : 'asc'
    };

    this.dashboardStore.cacheMyTasks(this.myProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  protected onPublicProjectsSort(event: Sort) {
    const cache = this.projectsCache();
    const state = {
      pageIndex: 0,
      pageSize: cache.pageSize,
      sortActive: event.direction !== '' ? event.active : 'name',
      sortDirection: event.direction !== '' ? event.direction : 'asc'
    };

    this.dashboardStore.cachePublicProjects(this.publicProjectsFilterForm.value.filter ?? '', state).subscribe();
  }

  protected onTabChange(event: MatTabChangeEvent) {
    this.dashboardStore.clearProjectsCache();
    this.currentTab.set(event.index);
  }

  protected getChipColorLocal(value: string | null): string {
    return getChipColor(value);
  }

  protected getChipTextLocal(value: string | null): string {
    return getChipTextKey(value);
  }

  protected getProjectCreatorLocal(project: ProjectResponse) : EssentialUserResponse {
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
