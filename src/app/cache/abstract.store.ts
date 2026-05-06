import { signal } from "@angular/core";
import { Entity, Page, PageCache, SimpleApiError } from "../models";
import { HttpErrorResponse } from "@angular/common/http";
import { EMPTY } from "rxjs";
import { getDefaultErrorMessageForType } from "../utils";

export abstract class AbstractStore<T extends Entity, F> {
  readonly cache = signal<PageCache<T, F>>({ pageIndex: 0, pageSize: 10, sort: '', direction: '', isLoading: false, error: null });

  protected readonly catchErrorDefault = (err: HttpErrorResponse) => {
    const error = err.error as SimpleApiError;

    this.postLoading(getDefaultErrorMessageForType(error));
    return EMPTY;
  };

  replace(newEntity: T) {
    this.cache.update(cache => {
      const currentPage = cache.page;

      return currentPage ? { ...cache, page: { ...currentPage, content: currentPage.content.map(e => e.id === newEntity.id ? newEntity : e) } } : cache;
    });
  }

  protected preLoading(pageIndex: number, pageSize: number, filter?: F, sort?: string, direction?: 'asc' | 'desc' | '') {
    this.cache.update(c => {
      return { ...c, filter, pageIndex, pageSize, sort: sort ?? '',
          direction: direction ?? '', isLoading: true, error: null };
    });
  }

  protected postLoading(page: Page<T>, add?: boolean) : void;
  protected postLoading(error: string) : void;

  protected postLoading(arg: Page<T> | string, add?: boolean) {
    if (typeof arg === 'string') {
      this.cache.update(c => {
        return {...c, isLoading: false, error: arg };
      })
    } else {
      this.cache.update(c => {
        if (add && c.page) {
          const newPage: Page<T> = { ...arg, content: c.page.content.concat(arg.content), size: c.page.size + arg.size };
          return {...c, page: newPage, isLoading: false};
        }
        return {...c, page: arg, isLoading: false};
      })
    }
  }

  clearCache() {
    this.cache.set({ pageIndex: 0, pageSize: 10, sort: '', direction: '', isLoading: false, error: null });
  }
}
