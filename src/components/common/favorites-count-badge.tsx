"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { subscribeFavoritesUpdated } from "@/lib/favorites-events";
import type { FavoritesResponseData } from "@/types/favorites";

type FavoritesApiResponse = {
  data: FavoritesResponseData | null;
  error: {
    code: string;
    message: string;
  } | null;
};

export function FavoritesCountBadge() {
  const { status } = useSession();
  const [count, setCount] = useState<number | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch("/api/favorites", { method: "GET" });
      const payload = (await response.json()) as FavoritesApiResponse;

      if (!response.ok || !payload.data) {
        return;
      }

      setCount(payload.data.total);
    } catch {
      // Silently ignore badge errors to avoid disrupting nav rendering.
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const unsubscribe = subscribeFavoritesUpdated(() => {
      void fetchCount();
    });

    queueMicrotask(() => {
      void fetchCount();
    });

    return unsubscribe;
  }, [status, fetchCount]);

  if (status !== "authenticated" || count === null) {
    return null;
  }

  const label = count > 99 ? "99+" : String(count);

  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
      {label}
    </span>
  );
}

