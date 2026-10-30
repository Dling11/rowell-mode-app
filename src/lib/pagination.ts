export type PaginatedResponse<T> = {
  items: T[];
  nextPage: number | null;
};
