import { Component, effect, signal } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { GeneralApiError, UserResponse } from '../../../models';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { UserService } from '../../../service/user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialog } from '@angular/material/dialog';
import { UserActionsDialog } from './user-actions-dialog/user-actions-dialog';
import { getUserRole } from '../../../utils';

interface TableState {
  pageIndex: number;
  pageSize: number;
  sortActive: string;
  sortDirection: 'asc' | 'desc' | '';
}

@Component({
  selector: 'app-manager-control-panel',
  imports: [MatCardModule, MatTableModule, MatPaginatorModule, MatSortModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule, MatRadioModule],
  templateUrl: './manager-control-panel.html',
  styleUrl: './manager-control-panel.css',
})
export class ManagerControlPanel {
  readonly isLoadingUsers = signal(false);
  readonly usersLoadingError = signal<string | null>(null);
  readonly usersTableState = signal<TableState>({ pageIndex: 0, pageSize: 25, sortActive: 'username', sortDirection: 'asc' });
  readonly usersTotalElements = signal(0);

  userColumns = ['id', 'username', 'email', 'isLocked', 'role'];
  usersDS = new MatTableDataSource<UserResponse>([]);

  usersFilterForm = new FormGroup({
    filter: new FormControl<string>('', { nonNullable: true }),
    type: new FormControl<'email' | 'username'>('username', { nonNullable: true })
  });

  constructor(private userService: UserService, private dialog: MatDialog) {
    effect(() => {
      this.usersTableState();
      this.loadUsers();
    });
    this.usersFilterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      const state = this.usersTableState();

      if (state.pageIndex === 0) {
        this.loadUsers();
      } else {
        this.usersTableState.update(state => {
          return { ...state, pageIndex: 0 };
        });
      }
    });
  }

  ngAfterViewInit() {
    this.loadUsers();
  }

  loadUsers() {
    const filter = this.usersFilterForm.value.filter ?? '';
    const type = this.usersFilterForm.value.type ?? 'username';

    const state = this.usersTableState();
      this.isLoadingUsers.set(true);
      this.usersLoadingError.set(null);
      this.userService.searchUsers(filter, type, state.pageIndex, state.pageSize,
          state.sortActive, state.sortDirection).subscribe({
        next: page => {
          this.usersDS.data = page.content;
          this.isLoadingUsers.set(false);
          this.usersTotalElements.set(page.totalElements);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.usersLoadingError.set(error ? error.errors[0] : 'Unknown error occured while loading users.');
        }
      });
  }

  onUsersPage(event: PageEvent) {
    this.usersTableState.update(state => {
      return { ...state, pageIndex: event.pageIndex, pageSize: event.pageSize };
    });
  }

  onUsersSort(event: Sort) {
    this.usersTableState.update(state => {
      return { ...state, sortActive: event.direction !== '' ? event.active : 'username', sortDirection: event.direction !== '' ? event.direction : 'asc' };
    })
  }

  onSelectUser(user: UserResponse) {
    this.dialog.open(UserActionsDialog, {
      data: user,
      disableClose: true,
      width: '480px'
    })
    .afterClosed()
    .subscribe(hasChanged => {
      if (hasChanged) {
        this.loadUsers();
      }
    })
    ;
  }

  getUserRoleLocal(user: UserResponse) : string {
    return getUserRole(user);
  }
}
