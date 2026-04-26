import { findPropertiesBySearch } from "@/server/repositories/search.repository";
import type { SearchQueryInput } from "@/server/validators/search";
import type { PropertyListItem } from "@/types/domain";
import type { SearchQuery, SearchResponseData } from "@/types/search";

function toSearchQuery(input: SearchQueryInput): SearchQuery {
  return {
    q: input.q,
    borough: input.borough,
    minRent: input.minRent,
    maxRent: input.maxRent,
    beds: input.beds,
    page: input.page,
    pageSize: input.pageSize,
    sort: input.sort,
  };
}

function toPropertyListItem(
  property: Awaited<ReturnType<typeof findPropertiesBySearch>>["items"][number],
): PropertyListItem {
  return {
    id: property.id,
    title: property.title,
    addressLine1: property.addressLine1,
    borough: property.borough,
    postalCode: property.postalCode,
    rent: property.rent,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms ? Number(property.bathrooms) : null,
    score: property.scores[0]?.overall ?? null,
  };
}

export async function searchProperties(input: SearchQueryInput): Promise<SearchResponseData> {
  const query = toSearchQuery(input);
  const { items, total } = await findPropertiesBySearch(query);

  const mappedItems = items.map(toPropertyListItem);

  if (query.sort === "score_desc") {
    mappedItems.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }

  return {
    query,
    items: mappedItems,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

