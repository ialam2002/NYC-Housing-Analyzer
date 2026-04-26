"use client";

import { useEffect, useRef, useState } from "react";

import { subscribeFavoritesUpdated, type FavoritesUpdatedDetail } from "@/lib/favorites-events";

const TOAST_MS = 2200;

export function FavoritesActionToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeFavoritesUpdated((detail: FavoritesUpdatedDetail) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      const nextMessage =
        detail.action === "saved"
          ? "Saved to favorites"
          : detail.action === "removed"
            ? "Removed from favorites"
            : "Favorites updated";

      setMessage(nextMessage);

      timeoutRef.current = window.setTimeout(() => {
        setMessage(null);
      }, TOAST_MS);
    });

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      unsubscribe();
    };
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed right-4 bottom-4 z-50 rounded-md border bg-card px-3 py-2 text-sm shadow-lg"
    >
      {message}
    </div>
  );
}

