"use client";

import { useState, useTransition } from "react";
import { signIn, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { emitFavoritesUpdated } from "@/lib/favorites-events";

type FavoriteToggleButtonProps = {
  propertyId: string;
  initialIsFavorite: boolean;
};

async function requestToggle(propertyId: string, shouldFavorite: boolean) {
  if (shouldFavorite) {
    return fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ propertyId }),
    });
  }

  return fetch(`/api/favorites?propertyId=${encodeURIComponent(propertyId)}`, {
    method: "DELETE",
  });
}

export function FavoriteToggleButton({ propertyId, initialIsFavorite }: FavoriteToggleButtonProps) {
  const { status } = useSession();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const label = isFavorite ? "Saved" : "Save";

  function onToggle() {
    if (status === "unauthenticated") {
      signIn();
      return;
    }

    setError(null);

    startTransition(async () => {
      const next = !isFavorite;
      const response = await requestToggle(propertyId, next);

      if (response.status === 401) {
        signIn();
        return;
      }

      if (!response.ok) {
        setError("Unable to update favorite");
        return;
      }

      setIsFavorite(next);
      emitFavoritesUpdated(next ? "saved" : "removed");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant={isFavorite ? "secondary" : "outline"} size="sm" disabled={isPending} onClick={onToggle}>
        {isPending ? "Saving..." : label}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

