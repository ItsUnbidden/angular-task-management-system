import { Component, effect, inject, signal } from '@angular/core';
import { SubtaskStore } from '../../../cache/subtask.store';
import { MatListModule } from '@angular/material/list';
import { SubtaskResponse } from '../../../models/subtask.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatFormFieldModule } from "@angular/material/form-field";
import { ValidationBoundaries } from '../../../config/validation-boundaries';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-subtasks-list',
  imports: [MatListModule, MatButtonModule, MatIconModule, ReactiveFormsModule, TranslatePipe, MatFormFieldModule, MatProgressSpinnerModule, MatInputModule, MatCheckboxModule],
  templateUrl: './subtasks-list.html',
  styleUrl: './subtasks-list.css',
})
export class SubtasksList {
  protected readonly NAME_MAX_LENGTH = ValidationBoundaries.SUBTASK_NAME_MAX_LENGTH;

  private readonly subtaskStore = inject(SubtaskStore);
  private readonly route = inject(ActivatedRoute);

  private readonly taskId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('taskId')))), { initialValue: 0 }
  );

  protected readonly subtaskCache = this.subtaskStore.cache.asReadonly();
  protected readonly creating = this.subtaskStore.creating.asReadonly();
  protected readonly editing = signal<number | null>(null);

  protected readonly createFormExpanded = signal(false);

  protected readonly subtaskForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [
      Validators.required,
      Validators.maxLength(this.NAME_MAX_LENGTH)
    ] })
  });

  protected readonly subtaskEditForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [
      Validators.required,
      Validators.maxLength(this.NAME_MAX_LENGTH)
    ] })
  });

  constructor() {
    effect(() => {
      const taskId = this.taskId();

      if (taskId) {
        this.subtaskStore.cacheSubtasks(taskId, 0, 10).subscribe();
      }
    });
    effect(() => {
      const creating = this.creating();
      
      if (creating) {
        this.subtaskForm.disable();
      } else {
        this.subtaskForm.enable();
      }
    });
  }

  protected onSelectedChange(subtask: SubtaskResponse, event: MatCheckboxChange) {
    event.source.checked = !event.checked;

    this.subtaskStore.updateSubtask(subtask, event.checked).subscribe();
  }

  protected getUpdating(id: number) : boolean {
    return this.subtaskStore.getUpdating(id);
  }

  protected onEdit(subtask: SubtaskResponse) {
    this.editing.set(subtask.id);

    this.subtaskEditForm.patchValue({
      name: subtask.name
    });
  }

  protected onEditSubmit(subtask: SubtaskResponse) {
    const newTitle = this.subtaskEditForm.value.name;

    if (newTitle) {
      this.subtaskStore.updateSubtask(subtask, newTitle).subscribe({
        next: () => {
          this.editing.set(null);
        }
      });
    }
  }

  protected onCreateSubmit() {
    const name = this.subtaskForm.value.name;

    if (name) this.subtaskStore.createSubtask(name).subscribe({
      next: () => {
        this.createFormExpanded.set(false);
      }
    });
  }

  protected onDelete(subtask: SubtaskResponse) {
    this.subtaskStore.deleteSubtask(subtask).subscribe();
  }
}
