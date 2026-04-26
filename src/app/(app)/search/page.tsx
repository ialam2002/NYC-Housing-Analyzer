import Link from "next/link";
import { getServerSession } from "next-auth";

import { FavoriteToggleButton } from "@/components/feature/favorite-toggle-button";
import { authOptions } from "@/server/auth/options";
import { listFavorites } from "@/server/services/favorites.service";
import { searchProperties } from "@/server/services/search.service";
import { searchQuerySchema } from "@/server/validators/search";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawQuery = {
    q: firstParam(params.q),
    borough: firstParam(params.borough),
    minRent: firstParam(params.minRent),
    maxRent: firstParam(params.maxRent),
    beds: firstParam(params.beds),
    page: firstParam(params.page),
    pageSize: firstParam(params.pageSize),
    sort: firstParam(params.sort),
  };

  const parsedQuery = searchQuerySchema.safeParse(rawQuery);
  const query = parsedQuery.success ? parsedQuery.data : searchQuerySchema.parse({});
  const results = await searchProperties(query);

  const session = await getServerSession(authOptions);
  const favoriteIds =
    session?.user?.id
      ? new Set((await listFavorites(session.user.id)).items.map((item) => item.propertyId))
      : new Set<string>();

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Search Results</h1>
        <p className="text-sm text-muted-foreground">
          {results.total} results · page {results.page} of {results.totalPages}
        </p>
        {!parsedQuery.success ? (
          <p className="text-sm text-destructive">Some query params were invalid and default filters were applied.</p>
        ) : null}
      </div>

      {results.items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          No properties match your filters yet. Try adjusting search criteria.
        </div>
      ) : (
        <div className="grid gap-3">
          {results.items.map((property) => (
            <article key={property.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <Link href={`/property/${property.id}`} className="text-base font-semibold hover:underline">
                    {property.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {property.addressLine1}, {property.borough} {property.postalCode}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${property.rent.toLocaleString()} · {property.bedrooms ?? "-"} bd · {property.bathrooms ?? "-"} ba
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                    Score: {property.score ?? "N/A"}
                  </span>
                  <FavoriteToggleButton
                    propertyId={property.id}
                    initialIsFavorite={favoriteIds.has(property.id)}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

