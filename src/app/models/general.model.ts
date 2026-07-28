export interface Entity {
  id: number;
}

export interface Page<T extends Entity> {
  content: T[];
  page: PageMeta;
}

export interface PageMeta {
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface Cache {
  isLoading: boolean;
  error: string | null;
}

export interface PageCache<T extends Entity, F> extends Cache {
  page?: Page<T>;
  filter?: F;
  pageIndex: number;
  pageSize: number;
  sort: string;
  direction: SortDirection
}

export interface SingleItemCache<T extends Entity> extends Cache {
  item?: T;
}

export interface TableState {
  pageIndex: number;
  pageSize: number;
  sortActive: string;
  sortDirection: SortDirection
}

type SortDirection = 'asc' | 'desc' | '';