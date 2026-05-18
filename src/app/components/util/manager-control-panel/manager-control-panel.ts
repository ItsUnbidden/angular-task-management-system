import { Component, effect, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { UserResponse } from '../../../models';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, EMPTY, switchMap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialog } from '@angular/material/dialog';
import { UserActionsDialog } from './user-actions-dialog/user-actions-dialog';
import { getUserRole } from '../../../utils';
import { UserStore } from '../../../cache/user.store';

@Component({
  selector: 'app-manager-control-panel',
  imports: [MatCardModule, MatTableModule, MatPaginatorModule, MatSortModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule, MatRadioModule],
  templateUrl: './manager-control-panel.html',
  styleUrl: './manager-control-panel.css',
})
export class ManagerControlPanel {
  private readonly userStore = inject(UserStore);

  protected readonly usersCache = this.userStore.cache;

  protected readonly userColumns = ['id', 'username', 'email', 'isLocked', 'role'];

  protected readonly usersFilterForm = new FormGroup({
    filter: new FormControl<string>('', { nonNullable: true }),
    type: new FormControl<'email' | 'username'>('username', { nonNullable: true })
  });

  constructor(private readonly dialog: MatDialog) {
    this.usersFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(() => {
        const cache = this.usersCache();

        return this.userStore.cacheUsers(
          this.usersFilterForm.value.filter ?? '',
          this.usersFilterForm.value.type ?? 'username', {
          pageIndex: cache.pageIndex,
          pageSize: cache.pageSize,
          sortActive: cache.sort,
          sortDirection: cache.direction
        });
      })
    ).subscribe();

    effect(() => {
      const currentCache = this.usersCache();

      if (currentCache.isLoading) {
        this.usersFilterForm.disable({ emitEvent: false });
      } else {
        this.usersFilterForm.enable({ emitEvent: false });
      }
    })
  }

  protected ngAfterViewInit() {
    this.userStore.cacheUsers(this.usersFilterForm.value.filter ?? '', this.usersFilterForm.value.type ?? 'username', {
      pageIndex: 0,
      pageSize: 25,
      sortActive: 'username',
      sortDirection: 'asc'
    }).subscribe();
  }

  protected onUsersPage(event: PageEvent) {
    const cache = this.usersCache();

    this.userStore.cacheUsers(
      this.usersFilterForm.value.filter ?? '',
      this.usersFilterForm.value.type ?? 'username', {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      sortActive: cache.sort,
      sortDirection: cache.direction
    }).subscribe();
  }

  protected onUsersSort(event: Sort) {
    const cache = this.usersCache();

    this.userStore.cacheUsers(
      this.usersFilterForm.value.filter ?? '',
      this.usersFilterForm.value.type ?? 'username', {
      pageIndex: 0,
      pageSize: cache.pageSize,
      sortActive: event.active,
      sortDirection: event.direction
    }).subscribe();
  }

  protected onSelectUser(user: UserResponse) {
    this.dialog.open(UserActionsDialog, {
      data: user,
      disableClose: true,
      width: '480px'
    })
    .afterClosed().pipe(switchMap(hasChanged => {
      if (hasChanged) {
        const cache = this.usersCache();

        return this.userStore.cacheUsers(
          this.usersFilterForm.value.filter ?? '',
          this.usersFilterForm.value.type ?? 'username', {
          pageIndex: cache.pageIndex,
          pageSize: cache.pageSize,
          sortActive: cache.sort,
          sortDirection: cache.direction
        });
      }
      return EMPTY;
    }))
    .subscribe();
  }

  protected getUserRoleLocal(user: UserResponse) : string {
    return getUserRole(user);
  }
}
