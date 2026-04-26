"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { emitFavoritesUpdated } from "@/lib/favorites-events";
import type { FavoriteItem, FavoritesResponseData } from "@/types/favorites";

type FavoritesApiResponse = {
  data: FavoritesResponseData | null;
  error: {
    code: string;
    message: string;
  } | null;
};

export function FavoritesPageClient() {
  const { status } = useSession();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingPropertyId, setRemovingPropertyId] = useState<string | null>(null);

  const isSignedOut = status === "unauthenticated";
  const isSessionLoading = status === "loading";

  const loadFavorites = useCallback(async () => {
    setError(null);
    setIsFetching(true);

    try {
      const response = await fetch("/api/favorites", { method: "GET" });
      const payload = (await response.json()) as FavoritesApiResponse;

      if (!response.ok || !payload.data) {
        setError(payload.error?.message ?? "Unable to load favorites.");
        return;
      }

      setItems(payload.data.items);
    } catch {
      setError("Unable to load favorites.");
    } finally {
      setIsFetching(false);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      queueMicrotask(() => {
        void loadFavorites();
      });
      return;
    }

    if (status === "unauthenticated") {
      return;
    }
  }, [status, loadFavorites]);

  async function onRemove(propertyId: string) {
    const previousItems = items;
    setRemovingPropertyId(propertyId);
    setItems((current) => current.filter((item) => item.propertyId !== propertyId));

    try {
      const response = await fetch(`/api/favorites?propertyId=${encodeURIComponent(propertyId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setItems(previousItems);
        setError("Unable to remove favorite. Please try again.");
        return;
      }

      emitFavoritesUpdated("removed");
    } catch {
      setItems(previousItems);
      setError("Unable to remove favorite. Please try again.");
    } finally {
      setRemovingPropertyId(null);
    }
  }

  const titleText = useMemo(() => {
    if (isSessionLoading || isFetching) {
      return "Loading your saved properties...";
    }

    if (isSignedOut) {
      return "Sign in to view and manage your saved properties.";
    }

    return `${items.length} saved propert${items.length === 1 ? "y" : "ies"}.`;
  }, [isSessionLoading, isFetching, isSignedOut, items.length]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{titleText}</p>

      {isSessionLoading || isFetching ? (
        <div className="grid gap-3">
          <div className="h-24 animate-pulse rounded-lg border bg-card" />
          <div className="h-24 animate-pulse rounded-lg border bg-card" />
          <div className="h-24 animate-pulse rounded-lg border bg-card" />
        </div>
      ) : null}

      {isSignedOut ? (
        <div className="rounded-lg border bg-card p-6 text-sm">
          <p className="text-muted-foreground">Please sign in to access favorites synced to your account.</p>
          <Button className="mt-4" size="sm" onClick={() => signIn()}>
            Sign in
          </Button>
        </div>
      ) : null}

      {!isSignedOut && error ? (
        <div className="rounded-lg border border-destructive/40 bg-card p-6 text-sm">
          <p className="text-destructive">{error}</p>
          <Button className="mt-4" variant="outline" size="sm" onClick={loadFavorites}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isSignedOut && !error && isLoaded && items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No favorites yet. Save properties from search or dashboard to compare later.
          <div className="mt-3">
            <Link href="/search" className="underline underline-offset-4">
              Browse properties
            </Link>
          </div>
        </div>
      ) : null}

      {!isSignedOut && !error && items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <Link href={`/property/${item.propertyId}`} className="text-base font-semibold hover:underline">
                    {item.property.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {item.property.addressLine1}, {item.property.borough} {item.property.postalCode}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${item.property.rent.toLocaleString()} · {item.property.bedrooms ?? "-"} bd · {item.property.bathrooms ?? "-"} ba
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                    Score: {item.property.score ?? "N/A"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={removingPropertyId === item.propertyId}
                    onClick={() => onRemove(item.propertyId)}
                  >
                    {removingPropertyId === item.propertyId ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

