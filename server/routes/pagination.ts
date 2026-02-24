import { PaginationResult } from '../types/pagination';

export function paginate<T>(items: T[], page: number, size: number): PaginationResult<T> {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / size);

  if (page * size >= totalItems) {
    return { page, size, totalItems, totalPages, content: [] };
  }

  const startIndex = page * size;
  const endIndex = startIndex + size;
  const paginatedItems = items.slice(startIndex, endIndex);
  return { page, size, totalItems, totalPages, content: paginatedItems };
}
