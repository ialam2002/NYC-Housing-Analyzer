export const FAVORITES_UPDATED_EVENT = "rentwise:favorites-updated";

export type FavoritesUpdateAction = "saved" | "removed";

export type FavoritesUpdatedDetail = {
  action?: FavoritesUpdateAction;
};

export function emitFavoritesUpdated(action?: FavoritesUpdateAction) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<FavoritesUpdatedDetail>(FAVORITES_UPDATED_EVENT, {
      detail: { action },
    }),
  );
}

export function subscribeFavoritesUpdated(listener: (detail: FavoritesUpdatedDetail) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<FavoritesUpdatedDetail>;
    listener(customEvent.detail ?? {});
  };

  window.addEventListener(FAVORITES_UPDATED_EVENT, handler);

  return () => {
    window.removeEventListener(FAVORITES_UPDATED_EVENT, handler);
  };
}

