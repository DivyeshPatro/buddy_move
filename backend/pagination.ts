export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: "asc" | "desc";
  filter?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const MAX_LIMIT = 100;

export function parsePagination(query: Record<string, string | undefined>): PaginationParams {
  let page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  let limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit ?? "20", 10) || 20));
  if (isNaN(page)) page = 1;
  if (isNaN(limit)) limit = 20;
  return {
    page,
    limit,
    sort: query.sort,
    order: (query.order === "asc" || query.order === "desc") ? query.order : "desc",
    filter: query.filter,
    search: query.search?.toLowerCase(),
  };
}

export function paginate<T>(
  items: T[],
  params: PaginationParams,
  options?: {
    sortFn?: (a: T, b: T, sort: string, order: "asc" | "desc") => number;
    filterFn?: (item: T, filter: string) => boolean;
    searchFn?: (item: T, search: string) => boolean;
  },
): PaginatedResult<T> {
  let filtered = [...items];

  if (params.search && options?.searchFn) {
    filtered = filtered.filter((item) => options.searchFn!(item, params.search!));
  }

  if (params.filter && options?.filterFn) {
    filtered = filtered.filter((item) => options.filterFn!(item, params.filter!));
  }

  if (params.sort && options?.sortFn) {
    filtered.sort((a, b) => options.sortFn!(a, b, params.sort!, params.order ?? "desc"));
  } else {
    filtered.sort((a, b) => String(b).localeCompare(String(a)));
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / params.limit) || 1;
  const start = (params.page - 1) * params.limit;
  const paged = filtered.slice(start, start + params.limit);

  return {
    data: paged,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

export function paginatedResponse<T>(items: T[], query: Record<string, string | undefined>, options?: {
  sortFn?: (a: T, b: T, sort: string, order: "asc" | "desc") => number;
  filterFn?: (item: T, filter: string) => boolean;
  searchFn?: (item: T, search: string) => boolean;
}): PaginatedResult<T> {
  return paginate(items, parsePagination(query), options);
}
