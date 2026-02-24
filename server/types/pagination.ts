export interface PaginationResult<T> {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  content: T[];
}
