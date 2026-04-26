import type { Borough } from "@prisma/client";

import type { PropertyListItem } from "@/types/domain";

export type SearchSort = "rent_asc" | "rent_desc" | "score_desc";

export type SearchQuery = {
  q?: string;
  borough?: Borough;
  minRent?: number;
  maxRent?: number;
  beds?: number;
  page: number;
  pageSize: number;
  sort: SearchSort;
};

export type SearchResponseData = {
  query: SearchQuery;
  items: PropertyListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

