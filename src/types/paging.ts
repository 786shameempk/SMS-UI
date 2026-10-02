/** One page of a list endpoint called with `pageNumber` (the services' PaginatedList shape). */
export interface ApiPage<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** A page mapped for the UI: the rows plus the total across all pages. */
export interface Page<T> {
  items: T[];
  totalCount: number;
}
